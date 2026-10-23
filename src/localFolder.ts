// Recordar la carpeta de música entre sesiones. Solo Chromium de escritorio
// tiene File System Access; en el resto (Firefox, Safari, Android) no existe y
// el modo local se queda con el <input>, que no persiste.
// Los File de un <input> no se pueden guardar, pero el handle de una carpeta sí
// viaja a IndexedDB, y con él se vuelve a leer sin repreguntar.

interface FileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

interface DirHandle {
  kind: "directory";
  name: string;
  entries(): AsyncIterableIterator<[string, DirHandle | FileHandle]>;
  queryPermission(opts?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(opts?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<DirHandle>;
  }
}

export interface Entrada {
  file: File;
  /** Ruta relativa a la carpeta elegida: de ahí sale el álbum. */
  path: string;
}

export const hayCarpetas = () => typeof window.showDirectoryPicker === "function";

const BASE = "radiostatio";
const ALMACEN = "handles";
const CLAVE = "carpeta";

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

function pedir<T>(hacer: (store: IDBObjectStore) => IDBRequest, modo: IDBTransactionMode): Promise<T> {
  return abrirDb().then(
    (db) =>
      new Promise<T>((ok, fail) => {
        const req = hacer(db.transaction(ALMACEN, modo).objectStore(ALMACEN));
        req.onsuccess = () => ok(req.result as T);
        req.onerror = () => fail(req.error);
      }),
  );
}

const guardarHandle = (h: DirHandle) => pedir<void>((s) => s.put(h, CLAVE), "readwrite");
const leerHandle = () => pedir<DirHandle | undefined>((s) => s.get(CLAVE), "readonly");
export const olvidarCarpeta = () => pedir<void>((s) => s.delete(CLAVE), "readwrite").catch(() => {});

async function recorrer(dir: DirHandle, base = ""): Promise<Entrada[]> {
  const salida: Entrada[] = [];
  for await (const [nombre, h] of dir.entries()) {
    const path = base ? `${base}/${nombre}` : nombre;
    if (h.kind === "directory") salida.push(...(await recorrer(h, path)));
    else salida.push({ file: await h.getFile(), path });
  }
  return salida;
}

export interface Carpeta {
  nombre: string;
  entradas: Entrada[];
}

/** Abre el selector de carpeta y la recuerda. null si el usuario cancela. */
export async function elegirCarpeta(): Promise<Carpeta | null> {
  if (!window.showDirectoryPicker) return null;
  let dir: DirHandle;
  try {
    dir = await window.showDirectoryPicker({ mode: "read" });
  } catch {
    return null; // cancelar tira AbortError
  }
  await guardarHandle(dir).catch(() => {});
  return { nombre: dir.name, entradas: await recorrer(dir) };
}

/**
 * La carpeta guardada, si Chrome todavía nos deja leerla sin preguntar.
 * Con "prompt" hace falta un gesto del usuario, así que se devuelve el nombre
 * sin las entradas y la UI ofrece el botón para reabrirla.
 */
export async function recuperarCarpeta(): Promise<Carpeta | { nombre: string } | null> {
  if (!hayCarpetas()) return null;
  const dir = await leerHandle().catch(() => undefined);
  if (!dir) return null;
  const permiso = await dir.queryPermission({ mode: "read" }).catch(() => "denied" as PermissionState);
  if (permiso !== "granted") return { nombre: dir.name };
  return { nombre: dir.name, entradas: await recorrer(dir) };
}

/** Reabre la carpeta guardada pidiendo permiso: va dentro de un click. */
export async function reabrirCarpeta(): Promise<Carpeta | null> {
  const dir = await leerHandle().catch(() => undefined);
  if (!dir) return null;
  const permiso = await dir.requestPermission({ mode: "read" }).catch(() => "denied" as PermissionState);
  if (permiso !== "granted") return null;
  return { nombre: dir.name, entradas: await recorrer(dir) };
}
