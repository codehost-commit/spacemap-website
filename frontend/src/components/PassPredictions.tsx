import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store.js';
import {
  applyWeatherFilter,
  fetchWeather,
  predictPasses,
  type VisiblePass,
} from '../simulation/pass-predictor.js';

/**
 * "Pass Predictions" overlay — visible satellite passes for the next 24 hours,
 * filtered by sunlight geometry, weather (cloud cover from Open-Meteo), and
 * moon brightness.
 */
export function PassPredictions() {
  const open = useStore((s) => s.openOverlays.has('passes'));
  const setOverlay = useStore((s) => s.setOverlay);
  const nameMap = useStore((s) => s.indexByNorad);
  const select = useStore((s) => s.select);
  const index = useStore((s) => s.index);

  const [passes, setPasses] = useState<VisiblePass[]>([]);
  const [computing, setComputing] = useState(false);
  const [observer, setObserver] = useState<{ latDeg: number; lonDeg: number; altKm: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  // Get location on open
  useEffect(() => {
    if (!open || observer) return;
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude ?? 0) / 1000,
        });
        setGeoError(null);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  }, [open, observer]);

  // Pick interesting satellites to predict (LEO payloads + ISS)
  const targetIds = useMemo(() => {
    if (!observer) return [];
    // Only predict for payloads in LEO (most likely to be visible)
    // + any saved satellites. Cap at 200 to keep compute reasonable.
    const ids: number[] = [];
    for (const entry of index) {
      if (entry.objectType !== 'payload') continue;
      if (entry.orbitClass && entry.orbitClass !== 'LEO') continue;
      ids.push(entry.noradId);
      if (ids.length >= 200) break;
    }
    return ids;
  }, [observer, index]);

  // Compute passes
  const compute = useCallback(async () => {
    if (!observer || targetIds.length === 0) return;
    setComputing(true);

    // Run prediction in small batches to avoid blocking the main thread
    const batchSize = 50;
    let allPasses: VisiblePass[] = [];
    for (let i = 0; i < targetIds.length; i += batchSize) {
      const batch = targetIds.slice(i, i + batchSize);
      const batchPasses = predictPasses(batch, nameMap, observer, 10);
      allPasses = allPasses.concat(batchPasses);
      // Yield to main thread between batches
      await new Promise((r) => setTimeout(r, 0));
    }

    // Fetch weather and apply filters
    const weather = await fetchWeather(observer.latDeg, observer.lonDeg);
    allPasses = applyWeatherFilter(allPasses, weather);

    // De-duplicate: keep only the best pass per satellite (highest peak elev)
    const bestByNorad = new Map<number, VisiblePass>();
    for (const p of allPasses) {
      const existing = bestByNorad.get(p.noradId);
      if (!existing || p.peakElevDeg > existing.peakElevDeg) {
        bestByNorad.set(p.noradId, p);
      }
    }

    // Sort: visible first, then by peak time
    const sorted = Array.from(bestByNorad.values()).sort((a, b) => {
      if (a.weatherBlocked !== b.weatherBlocked) return a.weatherBlocked ? 1 : -1;
      if (a.moonWashout !== b.moonWashout) return a.moonWashout ? 1 : -1;
      return a.riseTime.getTime() - b.riseTime.getTime();
    });

    setPasses(sorted);
    setComputing(false);
  }, [observer, targetIds, nameMap]);

  useEffect(() => {
    if (open && observer && targetIds.length > 0 && passes.length === 0 && !computing) {
      void compute();
    }
  }, [open, observer, targetIds, passes.length, computing, compute]);

  if (!open) return null;

  const visiblePasses = showBlocked ? passes : passes.filter((p) => !p.weatherBlocked);

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute z-10 flex w-[22rem] flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">
            Pass predictions
          </div>
          <div className="font-mono text-sm text-space-text">
            {observer
              ? `Next 24h from ${observer.latDeg.toFixed(2)}°, ${observer.lonDeg.toFixed(2)}°`
              : 'Locating...'}
          </div>
        </div>
        <button
          onClick={() => setOverlay('passes', false)}
          className="text-space-dim hover:text-space-text"
        >
          x
        </button>
      </header>

      {/* Legend bar */}
      <div className="flex items-center gap-3 border-b border-space-border px-3 py-1.5 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Visible
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Moon washout
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400/60" /> Cloudy
        </span>
        <label className="ml-auto flex items-center gap-1 text-space-dim cursor-pointer">
          <input
            type="checkbox"
            checked={showBlocked}
            onChange={(e) => setShowBlocked(e.target.checked)}
            className="accent-space-accent"
          />
          All
        </label>
      </div>

      {computing && (
        <div className="p-4 text-center text-xs text-space-dim">
          <div className="mb-2 text-space-accent">Computing passes...</div>
          Checking {targetIds.length} satellites over 24 hours
        </div>
      )}

      {geoError && <div className="p-3 text-xs text-space-warn">{geoError}</div>}

      {!computing && observer && visiblePasses.length === 0 && (
        <div className="p-4 text-center text-xs text-space-dim">
          No visible passes in the next 24 hours.
          {!showBlocked && passes.length > 0 && (
            <button
              onClick={() => setShowBlocked(true)}
              className="mt-1 block w-full text-space-accent hover:text-white"
            >
              Show {passes.length} weather-blocked passes
            </button>
          )}
        </div>
      )}

      <ul className="flex-1 overflow-auto font-mono text-xs max-h-[60vh]">
        {visiblePasses.map((p, i) => (
          <PassRow
            key={`${p.noradId}-${i}`}
            pass={p}
            onSelect={() => {
              select(p.noradId);
              (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(
                p.noradId,
              );
            }}
          />
        ))}
      </ul>

      {!computing && passes.length > 0 && (
        <footer className="border-t border-space-border px-3 py-2 text-[10px] text-space-dim">
          {passes.filter((p) => !p.weatherBlocked && !p.moonWashout).length} clear
          {' / '}
          {passes.filter((p) => p.moonWashout && !p.weatherBlocked).length} moon-washed
          {' / '}
          {passes.filter((p) => p.weatherBlocked).length} cloudy
          {' / '}
          {passes.length} total
          <button
            onClick={() => {
              setPasses([]);
              void compute();
            }}
            className="ml-2 text-space-accent hover:text-white"
          >
            Refresh
          </button>
        </footer>
      )}
    </aside>
  );
}

function PassRow({ pass, onSelect }: { pass: VisiblePass; onSelect: () => void }) {
  const statusColor = pass.weatherBlocked
    ? 'bg-red-400/60'
    : pass.moonWashout
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  const timeStr = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const blocked = pass.weatherBlocked || pass.moonWashout;

  return (
    <li
      className={`border-b border-space-border/40 px-3 py-2.5 last:border-b-0 transition-colors hover:bg-white/5 ${
        blocked ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
        <button
          onClick={onSelect}
          className="min-w-0 truncate text-left font-semibold text-space-text hover:text-space-accent"
        >
          {pass.name}
        </button>
        <span className="ml-auto shrink-0 text-space-dim">
          {pass.peakElevDeg.toFixed(0)}° peak
        </span>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-space-dim">
        <span>Rise {timeStr(pass.riseTime)}</span>
        <span className="text-center">Peak {timeStr(pass.peakTime)}</span>
        <span className="text-right">Set {timeStr(pass.setTime)}</span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-[10px] text-space-dim">
        <span>
          {formatAz(pass.riseAzDeg)} → {formatAz(pass.peakAzDeg)} → {formatAz(pass.setAzDeg)}
        </span>
        <span className="ml-auto">{formatDuration(pass.durationSec)}</span>
      </div>

      {(pass.cloudCoverPct != null || pass.moonWashout) && (
        <div className="mt-1 flex gap-2 text-[10px]">
          {pass.cloudCoverPct != null && (
            <span className={pass.weatherBlocked ? 'text-red-400' : 'text-space-dim'}>
              {pass.cloudCoverPct}% clouds
            </span>
          )}
          {pass.moonWashout && <span className="text-amber-400">Bright moon</span>}
        </div>
      )}
    </li>
  );
}

function formatAz(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg < 67.5) return 'NE';
  if (deg < 112.5) return 'E';
  if (deg < 157.5) return 'SE';
  if (deg < 202.5) return 'S';
  if (deg < 247.5) return 'SW';
  if (deg < 292.5) return 'W';
  return 'NW';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
