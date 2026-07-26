import { useEffect, useState } from "react";
import type { SatelliteTelemetry } from "@spacemap/shared";
import { useStore } from "../state/store.js";
import { findInSnapshot } from "../state/snapshot-util.js";

const ISS_NORAD = 25544;
// NASA's public HD Earth-viewing / ISS livestream. If NASA rotates the URL
// the panel still renders; the user can click through to YouTube.
const ISS_LIVE_EMBED =
  "https://www.youtube.com/embed/H999s0P1Er0?autoplay=1&mute=1";

/**
 * Floating ISS live-stream + telemetry panel. Uses the propagator snapshot
 * for real-time position and the backend's telemetry endpoint for orbital
 * elements. The video is embedded in an iframe so nothing has to leave the
 * browser to work.
 */
export function IssCamera() {
  const open = useStore((s) => s.openOverlays.has("iss"));
  const setOverlay = useStore((s) => s.setOverlay);
  const snapshot = useStore((s) => s.snapshot);
  const select = useStore((s) => s.select);
  const [tel, setTel] = useState<SatelliteTelemetry | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/satellites/${ISS_NORAD}/telemetry`);
        if (!res.ok) return;
        const t = (await res.json()) as SatelliteTelemetry;
        if (!cancelled) setTel(t);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open]);

  if (!open) return null;

  const row = findInSnapshot(snapshot, ISS_NORAD);

  return (
    <aside className="pointer-events-auto absolute bottom-24 left-4 z-10 w-[420px] rounded-md border border-space-border bg-space-panel/95 backdrop-blur">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">Live camera</div>
          <div className="font-mono text-sm text-space-text">ISS · NORAD 25544</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              select(ISS_NORAD);
              (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(ISS_NORAD);
            }}
            className="rounded border border-space-border px-2 py-0.5 text-[10px] text-space-dim hover:border-space-accent hover:text-space-text"
          >
            Focus
          </button>
          <button
            onClick={() => setOverlay("iss", false)}
            className="text-space-dim hover:text-space-text"
          >
            ×
          </button>
        </div>
      </header>
      <div className="aspect-video w-full bg-black">
        <iframe
          title="ISS live stream"
          src={ISS_LIVE_EMBED}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 px-3 py-2 font-mono text-xs">
        <Cell label="Altitude" value={row ? `${row.altKm.toFixed(1)} km` : "—"} />
        <Cell label="Speed" value={row ? `${row.speedKmS.toFixed(3)} km/s` : "—"} />
        <Cell label="Period" value={tel ? `${tel.elements.periodMinutes.toFixed(2)} min` : "—"} />
        <Cell label="Latitude" value={row ? `${row.latDeg.toFixed(2)}°` : "—"} />
        <Cell label="Longitude" value={row ? `${row.lonDeg.toFixed(2)}°` : "—"} />
        <Cell label="Sunlit" value={tel ? (tel.sunlit ? "Yes" : "Shadow") : "—"} />
      </div>
    </aside>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-space-dim">{label}</span>
      <span className="text-space-text">{value}</span>
    </div>
  );
}
