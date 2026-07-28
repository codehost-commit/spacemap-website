import { useEffect, useState } from "react";
import type { SatelliteTelemetry } from "@spacemap/shared";
import { useStore, type CameraMode } from "../state/store.js";
import { findInSnapshot } from "../state/snapshot-util.js";
import { computeTelemetry } from "../simulation/client-telemetry.js";
import { ConjunctionPanel } from "./ConjunctionPanel.js";

const MODE_LABEL: Record<CameraMode, string> = {
  orbit: "Orbit",
  follow: "Follow",
  pov: "POV",
};

export function TelemetryPanel() {
  const selected = useStore((s) => s.selectedNoradId);
  const snapshot = useStore((s) => s.snapshot);
  const name = useStore((s) => (selected != null ? s.indexByNorad.get(selected) : undefined));
  const select = useStore((s) => s.select);
  const cameraMode = useStore((s) => s.cameraMode);
  const setCameraMode = useStore((s) => s.setCameraMode);
  const savedIds = useStore((s) => s.savedIds);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const simTimeMs = useStore((s) => s.simTimeMs);
  // Suppress the panel while overlays own the right edge.
  const skyOpen = useStore((s) => s.openOverlays.has("sky"));
  const [telemetry, setTelemetry] = useState<SatelliteTelemetry | null>(null);

  const live = selected != null ? findInSnapshot(snapshot, selected) : null;
  const isSaved = selected != null && savedIds.has(selected);

  useEffect(() => {
    setTelemetry(null);
    if (selected == null) return;
    // Compute telemetry locally from the in-browser catalog — works with no
    // backend running (GitHub Pages, offline preview, etc.). Refreshes on
    // simTimeMs so element-derived values (period, etc. stay in sync with
    // time-warping).
    const t = computeTelemetry(selected, new Date(simTimeMs));
    if (t) setTelemetry(t);
  }, [selected, simTimeMs]);

  if (skyOpen) return null;

  if (selected == null) {
    return (
      <aside className="spacemap-telemetry pointer-events-auto absolute left-4 top-[8.75rem] z-10 w-[19.25rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-space-border bg-space-panel/92 p-4 text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="text-space-dim">
          Click any satellite, or search by name / NORAD id.
        </div>
      </aside>
    );
  }

  return (
    <aside className="spacemap-telemetry pointer-events-auto absolute left-4 top-[8.75rem] z-10 flex w-[19.25rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-start justify-between gap-2 border-b border-space-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-space-dim">
              NORAD {selected}
            </span>
            <button
              onClick={() => toggleSaved(selected)}
              className={`text-sm leading-none ${
                isSaved ? "text-space-warn" : "text-space-dim hover:text-space-text"
              }`}
              title={isSaved ? "Remove from saved" : "Save"}
            >
              {isSaved ? "★" : "☆"}
            </button>
          </div>
          <div className="truncate font-mono text-sm font-semibold text-space-text">
            {name ?? telemetry?.meta.name ?? "Loading…"}
          </div>
          {live && (
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-space-accent">
              {live.orbitClass}
            </div>
          )}
        </div>
        <button
          onClick={() => select(null)}
          className="rounded border border-space-border px-2 py-0.5 text-[10px] text-space-dim hover:text-space-text"
        >
          Close
        </button>
      </header>

      <div className="flex gap-1 border-b border-space-border px-3 py-2 font-mono text-[11px]">
        {(["orbit", "follow", "pov"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setCameraMode(m)}
            className={`flex-1 rounded border px-2 py-1 ${
              cameraMode === m
                ? "border-space-accent bg-space-accent/10 text-space-accent"
                : "border-space-border text-space-dim hover:text-space-text"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 font-mono text-xs">
          <Field label="Latitude" value={live ? fmt(live.latDeg, 3, "°") : "—"} />
          <Field label="Longitude" value={live ? fmt(live.lonDeg, 3, "°") : "—"} />
          <Field label="Altitude" value={live ? fmt(live.altKm, 1, " km") : "—"} />
          <Field label="Speed" value={live ? fmt(live.speedKmS, 3, " km/s") : "—"} />
          {telemetry && (
            <>
              <Field label="Inclination" value={fmt(telemetry.elements.inclinationDeg, 2, "°")} />
              <Field label="Eccentricity" value={telemetry.elements.eccentricity.toFixed(5)} />
              <Field label="Period" value={fmt(telemetry.elements.periodMinutes, 2, " min")} />
              <Field
                label="Mean motion"
                value={fmt(telemetry.elements.meanMotionRevPerDay, 4, " rev/day")}
              />
              <Field label="Apogee" value={fmt(telemetry.elements.apogeeKm, 1, " km")} />
              <Field label="Perigee" value={fmt(telemetry.elements.perigeeKm, 1, " km")} />
              <Field label="RAAN" value={fmt(telemetry.elements.raanDeg, 2, "°")} />
              <Field label="Arg. perigee" value={fmt(telemetry.elements.argPerigeeDeg, 2, "°")} />
              <Field label="Sunlit" value={telemetry.sunlit ? "Yes" : "In shadow"} />
              <Field
                label="Δt (rel.)"
                value={`${telemetry.relativisticOffsetSec.toExponential(3)} s`}
              />
            </>
          )}
          {live && (
            <>
              <Field label="ECI X" value={`${live.eci[0].toFixed(1)} km`} wide />
              <Field label="ECI Y" value={`${live.eci[1].toFixed(1)} km`} wide />
              <Field label="ECI Z" value={`${live.eci[2].toFixed(1)} km`} wide />
              <Field
                label="Sim time"
                value={new Date(simTimeMs).toISOString().slice(11, 19) + " UTC"}
                wide
              />
            </>
          )}
        </div>
        <ConjunctionPanel />
      </div>
    </aside>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex justify-between" : "flex flex-col"}>
      <span className="text-[9px] uppercase tracking-widest text-space-dim">{label}</span>
      <span className="text-space-text">{value}</span>
    </div>
  );
}

function fmt(n: number, digits: number, unit: string): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits) + unit;
}
