import { useEffect, useState } from "react";
import { getDevices, transferPlayback, type Device } from "../spotify/player";
import { TitleBar } from "./Compu";
import "./Devices.css";

const TYPE_LABELS: Record<string, string> = {
  Computer: "Compu",
  Smartphone: "Celular",
  Speaker: "Parlante",
  TV: "Tele",
  CastVideo: "Chromecast",
  CastAudio: "Chromecast",
  Tablet: "Tablet",
  GameConsole: "Consola",
  Automobile: "Auto",
};

/** Selector de salida, como el de un amplificador: un LED encendido en el que suena. */
export function Devices({ trackUri }: { trackUri: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState(false);

  function load() {
    return getDevices()
      .then((list) => {
        setDevices(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }

  // Recarga con cada canción: así aparece el celular que se acaba de abrir.
  useEffect(() => {
    load();
  }, [trackUri]);

  async function choose(id: string) {
    setBusy(id);
    try {
      await transferPlayback(id);
      // Spotify tarda un instante en mover la reproducción.
      await new Promise((r) => setTimeout(r, 800));
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="devices" aria-label="Dónde suena">
      <TitleBar title="Salida" />
      <div className="devices__header">
        <h2 className="rack__label">Salida</h2>
        <button className="devices__refresh" onClick={() => load()} aria-label="Buscar dispositivos">
          ↻
        </button>
      </div>
      <div className="devices__panel">
        {failed && <p className="devices__note">No se pudo hablar con Spotify</p>}
        {!failed && devices.length === 0 && (
          <p className="devices__note">Abre Spotify en otro aparato y aparece acá</p>
        )}
        {devices.map((device) => (
          <button
            key={device.id}
            className={`devices__option ${device.isActive ? "devices__option--active" : ""}`}
            onClick={() => choose(device.id)}
            disabled={device.isActive || busy !== ""}
            aria-pressed={device.isActive}
          >
            <span className={`devices__led ${busy === device.id ? "devices__led--busy" : ""}`} aria-hidden="true" />
            <span className="devices__name">{device.name}</span>
            <span className="devices__type">{TYPE_LABELS[device.type] ?? device.type}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
