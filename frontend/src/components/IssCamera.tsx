import { useEffect, useState } from "react";
import type { SatelliteTelemetry } from "@spacemap/shared";
import { useStore } from "../state/store.js";
import { findInSnapshot } from "../state/snapshot-util.js";
import { computeTelemetry } from "../simulation/client-telemetry.js";

const ISS_NORAD = 25544;
// ISS live YouTube embed. Autoplay works only when muted per browser policy;
// controls are hidden for a clean panel — click through to youtube.com to
// unmute or interact.
const ISS_LIVE_EMBED =
  "https://www.youtube.com/embed/awQzjn72bI0?autoplay=1&mute=1&controls=0";

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
    const refresh = () => {
      const t = computeTelemetry(ISS_NORAD, new Date());
      if (t) setTel(t);
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const row = findInSnapshot(snapshot, ISS_NORAD);

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute bottom-24 right-40 z-10 flex max-h-[calc(100vh-14rem)] w-[400px] flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
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
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
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
