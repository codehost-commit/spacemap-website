import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../state/store.js';
import {
  MARS_KIND_COLOR,
  MARS_KIND_LABEL,
  findMarsOrbiter,
} from '../simulation/mars-catalog.js';
import { sampleOrbit } from '../simulation/mars-propagator.js';

/**
 * Telemetry panel for a selected Mars orbiter — the Mars twin of
 * LunarTelemetryPanel. Recomputes the orbit sample every second (or when
 * simulated time jumps) so altitude / velocity / areocentric lat-lon
 * live-update as the spacecraft sweeps around Mars.
 */
export function MarsTelemetryPanel() {
  const selectedId = useStore((s) => s.selectedMarsId);
  const clearSelection = useStore((s) => s.setMarsSelection);
  const simTimeMs = useStore((s) => s.simTimeMs);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!selectedId) return null;
  const orbiter = findMarsOrbiter(selectedId);
  if (!orbiter) return null;

  const now = new Date(simTimeMs);
  const s = sampleOrbit(orbiter.orbit, now);
  const accentColor = MARS_KIND_COLOR[orbiter.kind];

  return (
    <div
      key={`${selectedId}-${tick}`}
      className="pointer-events-auto absolute left-4 top-40 z-20 w-[22rem] rounded-2xl border border-space-border bg-space-panel/94 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-space-dim">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
            />
            {orbiter.agency} · {MARS_KIND_LABEL[orbiter.kind]}
          </div>
          <div className="mt-1 text-base font-semibold text-white">{orbiter.name}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-space-dim">{orbiter.summary}</div>
        </div>
        <button
          onClick={() => clearSelection(null)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
          aria-label="Clear Mars selection"
        >
          <X size={14} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
        <Stat label="Altitude" value={`${s.altitudeKm.toFixed(1)} km`} />
        <Stat label="Speed" value={`${s.speedKmS.toFixed(3)} km/s`} />
        <Stat label="Areocentric lat" value={formatLat(s.lat_deg)} />
        <Stat label="Areocentric lon" value={formatLon(s.lon_deg)} />
        <Stat label="Inclination" value={`${orbiter.orbit.i_deg.toFixed(1)}°`} />
        <Stat label="Eccentricity" value={orbiter.orbit.e.toFixed(4)} />
        <Stat label="Semi-major axis" value={`${orbiter.orbit.a_km.toFixed(0)} km`} />
        <Stat
          label="Period"
          value={
            s.periodMin < 240 ? `${s.periodMin.toFixed(1)} min` : `${(s.periodMin / 60).toFixed(2)} h`
          }
        />
      </div>

      <footer className="border-t border-white/5 px-4 py-3 text-[10px] leading-relaxed text-space-dim">
        Launched {orbiter.launched} · Elements anchored at {orbiter.orbit.epoch.slice(0, 10)}.
        <br />
        Source: {orbiter.source}
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-widest text-space-dim">{label}</span>
      <span className="mt-0.5 text-space-text">{value}</span>
    </div>
  );
}

function formatLat(deg: number): string {
  const hemi = deg >= 0 ? 'N' : 'S';
  return `${Math.abs(deg).toFixed(2)}° ${hemi}`;
}

function formatLon(deg: number): string {
  const norm = ((deg + 540) % 360) - 180;
  const hemi = norm >= 0 ? 'E' : 'W';
  return `${Math.abs(norm).toFixed(2)}° ${hemi}`;
}
