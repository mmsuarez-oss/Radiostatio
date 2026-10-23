// La tarjeta para compartir unas líneas de la letra en redes, del tamaño de las
// historias (1080×1920). Sale según el estilo elegido: la hoja crema con resaltador
// (Analógico) o la ventana del documento con las líneas seleccionadas (Compu 2000).

export interface CardInput {
  lines: string[];
  title: string;
  artists: string;
  albumArt: string;
}

const W = 1080;
const H = 1920;
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const WIN = 'Tahoma, Verdana, "Segoe UI", sans-serif';

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    // Las tapas de Spotify permiten esto; sin él la imagen no se podría exportar.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    // Sin tapa la tarjeta igual sale.
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Parte un texto en renglones que entren en el ancho. */
export function wrap(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const rows: string[] = [];
  let row = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = row ? `${row} ${word}` : word;
    if (row && measure(next) > maxWidth) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  }
  if (row) rows.push(row);
  return rows;
}

/** Recorta con … lo que no entra en un renglón. */
function fit(ctx: Ctx, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Mezcla un color hacia otro: amount 0 lo deja igual, 1 lo vuelve el otro. */
function mix(color: Rgb, toward: Rgb, amount: number) {
  return `rgb(${color.map((c, i) => Math.round(c + (toward[i] - c) * amount)).join(",")})`;
}

function averageColor(img: HTMLImageElement): Rgb {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** El estilo y los colores elegidos en el panel de la pintura. */
function currentTheme() {
  const app = document.querySelector<HTMLElement>(".app");
  const css = app ? getComputedStyle(app) : null;
  return {
    skin: app?.dataset.skin ?? "analogico",
    accent: css?.getPropertyValue("--accent").trim() || "#e3b765",
    body: css?.getPropertyValue("--body").trim() || "#1f5aa8",
  };
}

/** Elige el tamaño de letra más grande con el que todo entra en el alto disponible. */
function sizeLines(ctx: Ctx, lines: string[], font: (size: number) => string, maxWidth: number, maxHeight: number) {
  let size = 64;
  let rows: string[] = [];
  for (; size >= 32; size -= 4) {
    ctx.font = font(size);
    rows = lines.flatMap((line) => wrap((t) => ctx.measureText(t).width, line, maxWidth));
    if (rows.length * size * 1.45 <= maxHeight) break;
  }
  return { size, rows, lineHeight: size * 1.45 };
}

function drawCover(ctx: Ctx, img: HTMLImageElement | null, x: number, y: number, size: number, fallback: string) {
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, size, size);
  }
}

// ---------- Analógico: la hoja de letras con resaltador ----------

async function drawPaper(ctx: Ctx, input: CardInput, img: HTMLImageElement | null, accent: string) {
  const avg = img ? averageColor(img) : ([40, 40, 44] as Rgb);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(avg, [0, 0, 0], 0.45));
  bg.addColorStop(1, mix(avg, [0, 0, 0], 0.78));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  await document.fonts.load('40px "Permanent Marker"').catch(() => {});

  const x = 90;
  const width = W - 180;
  const pad = 80;
  const cover = 200;
  const textWidth = width - pad * 2;
  const fixed = pad * 2 + cover + 80 + 80 + 50;
  const { size, rows, lineHeight } = sizeLines(ctx, input.lines, (s) => `700 ${s}px ${SANS}`, textWidth, H - 320 - fixed);
  const height = fixed + rows.length * lineHeight;
  const y = (H - height) / 2;

  // La hoja, apenas torcida, como apoyada sobre la mesa
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.02);
  ctx.translate(-W / 2, -H / 2);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  const paper = ctx.createLinearGradient(x, y, x + width, y + height);
  paper.addColorStop(0, "#f4ecdb");
  paper.addColorStop(1, "#e9dcc0");
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, width, height);
  ctx.shadowColor = "transparent";

  // Renglones
  ctx.fillStyle = "rgba(58,45,23,0.08)";
  for (let ry = y + 56; ry < y + height; ry += 56) ctx.fillRect(x, ry, width, 2);

  // Tapa, título y artista
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  drawCover(ctx, img, x + pad, y + pad, cover, "#d8c9a7");
  ctx.shadowColor = "transparent";
  const infoX = x + pad + cover + 36;
  const infoWidth = width - pad * 2 - cover - 36;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#3a2d17";
  ctx.font = `700 46px ${SANS}`;
  const titleRows = wrap((t) => ctx.measureText(t).width, input.title, infoWidth).slice(0, 2);
  titleRows.forEach((row, i) => ctx.fillText(fit(ctx, row, infoWidth), infoX, y + pad + 20 + i * 56));
  ctx.fillStyle = "rgba(58,45,23,0.65)";
  ctx.font = `36px ${SANS}`;
  ctx.fillText(fit(ctx, input.artists, infoWidth), infoX, y + pad + 20 + titleRows.length * 56 + 10);

  // Las líneas elegidas, marcadas con resaltador
  let ly = y + pad + cover + 80;
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.textBaseline = "middle";
  for (const row of rows) {
    const rowWidth = ctx.measureText(row).width;
    ctx.fillStyle = `${accent}b3`;
    ctx.fillRect(x + pad - 8, ly + lineHeight * 0.16, rowWidth + 16, lineHeight * 0.7);
    ctx.fillStyle = "#1d160b";
    ctx.fillText(row, x + pad, ly + lineHeight / 2);
    ly += lineHeight;
  }

  // La firma, escrita a mano abajo a la derecha
  ctx.font = `40px "Permanent Marker", cursive`;
  ctx.fillStyle = "rgba(58,45,23,0.55)";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Radiostatio", x + width - pad, y + height - pad + 10);
  ctx.textAlign = "left";
  ctx.restore();
}

// ---------- Compu 2000: el documento abierto con las líneas seleccionadas ----------

const FACE = "#d4d0c8";

/** Rectángulo gris con relieve: hacia afuera (botón, ventana) o hundido (campo, lista). */
function bevel(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, raised = true) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  const [light, dark, mid] = raised ? ["#ffffff", "#404040", "#808080"] : ["#808080", "#ffffff", "#404040"];
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = mid;
  ctx.fillRect(x + 3, y + h - 6, w - 6, 3);
  ctx.fillRect(x + w - 6, y + 3, 3, h - 6);
}

function drawCompu(ctx: Ctx, input: CardInput, img: HTMLImageElement | null, body: string) {
  const bodyRgb = toRgb(body);
  const select = mix(bodyRgb, [0, 0, 0], 0.25);

  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(0, 0, W, H);

  // Barra de tareas: Inicio, la ventana abierta y el reloj
  const barH = 96;
  ctx.fillStyle = FACE;
  ctx.fillRect(0, H - barH, W, barH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, H - barH + 3, W, 3);
  ctx.textBaseline = "middle";
  bevel(ctx, 10, H - barH + 16, 200, 66, FACE);
  const logo = ["#e0412b", "#3fa142", "#2b63d6", "#f2c12e"];
  logo.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(30 + (i % 2) * 18, H - barH + 31 + Math.floor(i / 2) * 18, 15, 15);
  });
  ctx.fillStyle = "#000";
  ctx.font = `700 34px ${WIN}`;
  ctx.fillText("Inicio", 80, H - barH + 50);
  bevel(ctx, 222, H - barH + 16, 560, 66, "#e8e6e0", false);
  ctx.font = `700 30px ${WIN}`;
  ctx.fillText(fit(ctx, `Radiostatio - ${input.title}`, 520), 242, H - barH + 50);
  bevel(ctx, W - 240, H - barH + 16, 230, 66, FACE, false);
  ctx.font = `30px ${WIN}`;
  ctx.textAlign = "center";
  ctx.fillText(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), W - 125, H - barH + 50);
  ctx.textAlign = "left";

  // Medidas de la ventana
  const x = 60;
  const width = W - 120;
  const titleH = 64;
  const menuH = 60;
  const statusH = 54;
  const docPad = 50;
  const cover = 170;
  const docWidth = width - 32;
  const chrome = 8 + titleH + menuH + statusH + 16;
  const fixedDoc = docPad * 2 + 70 + cover;
  const { size, rows, lineHeight } = sizeLines(ctx, input.lines, (s) => `${s}px ${WIN}`, docWidth - docPad * 2, H - barH - 160 - chrome - fixedDoc);
  const docH = fixedDoc + rows.length * lineHeight;
  const height = chrome + docH;
  const y = (H - barH - height) / 2;

  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  bevel(ctx, x, y, width, height, FACE);
  ctx.shadowColor = "transparent";

  // Barra de título
  const title = ctx.createLinearGradient(x, 0, x + width, 0);
  title.addColorStop(0, select);
  title.addColorStop(1, mix(bodyRgb, [255, 255, 255], 0.65));
  ctx.fillStyle = title;
  ctx.fillRect(x + 8, y + 8, width - 16, titleH);
  ctx.fillStyle = "#fff";
  ctx.font = `700 34px ${WIN}`;
  ctx.fillText(fit(ctx, `${input.title}.doc`, width - 240), x + 24, y + 8 + titleH / 2);
  ["_", "□", "×"].forEach((glyph, i) => {
    const bx = x + width - 16 - (3 - i) * 54;
    bevel(ctx, bx, y + 18, 48, 44, FACE);
    ctx.fillStyle = "#000";
    ctx.font = `700 28px ${WIN}`;
    ctx.textAlign = "center";
    ctx.fillText(glyph, bx + 24, y + 40);
    ctx.textAlign = "left";
  });

  // Menú, con la primera letra subrayada
  let mx = x + 24;
  const my = y + 8 + titleH + menuH / 2;
  ctx.font = `30px ${WIN}`;
  for (const item of ["Archivo", "Edición", "Ver", "Insertar", "Formato"]) {
    ctx.fillStyle = "#000";
    ctx.fillText(item, mx, my);
    ctx.fillRect(mx, my + 16, ctx.measureText(item[0]).width, 2);
    mx += ctx.measureText(item).width + 34;
  }

  // El documento
  const docX = x + 16;
  const docY = y + 8 + titleH + menuH;
  bevel(ctx, docX, docY, docWidth, docH, "#ffffff", false);
  let ly = docY + docPad;
  ctx.font = `${size}px ${WIN}`;
  for (const row of rows) {
    ctx.fillStyle = select;
    ctx.fillRect(docX + docPad - 6, ly + lineHeight * 0.1, ctx.measureText(row).width + 12, lineHeight * 0.8);
    ctx.fillStyle = "#fff";
    ctx.fillText(row, docX + docPad, ly + lineHeight / 2);
    ly += lineHeight;
  }

  // Tapa y datos de la canción al pie del documento
  const infoY = ly + 70;
  drawCover(ctx, img, docX + docPad, infoY, cover, FACE);
  const infoX = docX + docPad + cover + 30;
  const infoWidth = docWidth - docPad * 2 - cover - 30;
  ctx.fillStyle = "#000";
  ctx.font = `700 40px ${WIN}`;
  ctx.fillText(fit(ctx, input.title, infoWidth), infoX, infoY + cover / 2 - 26);
  ctx.fillStyle = "#404040";
  ctx.font = `32px ${WIN}`;
  ctx.fillText(fit(ctx, input.artists, infoWidth), infoX, infoY + cover / 2 + 26);

  // Barra de estado
  const sy = docY + docH + 8;
  ctx.font = `28px ${WIN}`;
  let sx = x + 16;
  for (const [text, w] of [["Pág. 1", 140], ["Sec. 1", 140], ["Radiostatio", width - 32 - 280]] as const) {
    bevel(ctx, sx, sy, w - 6, statusH - 8, FACE, false);
    ctx.fillStyle = "#000";
    ctx.fillText(text, sx + 14, sy + (statusH - 8) / 2);
    sx += w;
  }
}

/** Arma la tarjeta y la devuelve como PNG. */
export async function makeLyricsCard(input: CardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = await loadImage(input.albumArt);
  const theme = currentTheme();
  if (theme.skin === "compu") drawCompu(ctx, input, img, theme.body);
  else await drawPaper(ctx, input, img, theme.accent);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo armar la tarjeta"))), "image/png"),
  );
}
