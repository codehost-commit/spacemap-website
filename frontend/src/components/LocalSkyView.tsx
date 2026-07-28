import { useEffect, useState } from "react";
import { useStore } from "../state/store.js";
import { overheadPasses } from "../state/snapshot-util.js";

interface Observer {
  latDeg: number;
  lonDeg: number;
  altKm: number;
  label: string;
}

/**
 * "What's overhead right now" — uses browser geolocation to compute topocentric
 * elevation/azimuth for every satellite in the current snapshot.
 */
export function LocalSkyView() {
  const open = useStore((s) => s.openOverlays.has("sky"));
  const setOverlay = useStore((s) => s.setOverlay);
  const snapshot = useStore((s) => s.snapshot);
  const names = useStore((s) => s.indexByNorad);
  const select = useStore((s) => s.select);
  const [observer, setObserver] = useState<Observer | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [minElev, setMinElev] = useState(10);

  useEffect(() => {
    if (!open || observer) return;
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude ?? 0) / 1000,
          label: "Your location",
        });
        setGeoError(null);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  }, [open, observer]);

  if (!open) return null;

  const passes = observer
    ? overheadPasses(snapshot, observer.latDeg, observer.lonDeg, observer.altKm, minElev)
    : [];

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute bottom-24 right-16 z-10 flex max-h-[calc(100vh-14rem)] w-[400px] flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">Local sky</div>
          <div className="font-mono text-sm text-space-text">
            {observer
              ? `${observer.latDeg.toFixed(3)}°, ${observer.lonDeg.toFixed(3)}°`
              : "Locating…"}
          </div>
        </div>
        <button
          onClick={() => setOverlay("sky", false)}
          className="text-space-dim hover:text-space-text"
        >
          ×
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-space-border px-3 py-2 font-mono text-xs">
        <span className="text-space-dim">Min elev</span>
        <input
          type="range"
          min="0"
          max="45"
          step="5"
          value={minElev}
          onChange={(e) => setMinElev(Number(e.target.value))}
          className="flex-1 accent-space-accent"
        />
        <span className="w-8 text-right text-space-text">{minElev}°</span>
      </div>

      {geoError && (
        <div className="p-3 text-xs text-space-warn">{geoError}</div>
      )}

      <ul className="flex-1 overflow-auto font-mono text-xs">
        {passes.length === 0 && observer && !geoError && (
          <li className="p-3 text-space-dim">Nothing above {minElev}° right now.</li>
        )}
        {passes.map((p) => (
          <li
            key={p.noradId}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-space-border/40 px-3 py-1.5 last:border-b-0"
          >
            <button
              onClick={() => {
                select(p.noradId);
                (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(p.noradId);
              }}
              className="min-w-0 truncate text-left text-space-text hover:text-space-accent"
            >
              {names.get(p.noradId) ?? `#${p.noradId}`}
            </button>
            <span className="text-space-dim">el {p.elevationDeg.toFixed(0)}°</span>
            <span className="text-space-dim">az {p.azimuthDeg.toFixed(0)}°</span>
            <span className="text-space-dim">{p.rangeKm.toFixed(0)} km</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
