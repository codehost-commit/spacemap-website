import { X } from 'lucide-react';
import { useStore } from '../state/store.js';
import {
  LUNAR_SITE_KIND_COLOR,
  LUNAR_SITE_KIND_LABEL,
  findLunarSurfaceSite,
} from '../simulation/lunar-surface-catalog.js';

/**
 * Info panel for the currently-selected lunar surface site. Renders on
 * the same side of the screen as the orbiter telemetry panel, offset
 * downward so the two can coexist when the user has both an orbiter and
 * a surface site selected at once.
 */
export function LunarSurfacePanel() {
  const selectedId = useStore((s) => s.selectedLunarSurfaceId);
  const clearSelection = useStore((s) => s.setLunarSurfaceSelection);
  const orbiterSelected = useStore((s) => s.selectedLunarId);

  if (!selectedId) return null;
  const site = findLunarSurfaceSite(selectedId);
  if (!site) return null;
  const color = LUNAR_SITE_KIND_COLOR[site.kind];
  const kindLabel = LUNAR_SITE_KIND_LABEL[site.kind];

  // Slide down under the orbiter telemetry panel when it's open, otherwise
  // sit in its top-left spot so a lonely surface pick doesn't stack under
  // empty space.
  const topClass = orbiterSelected ? 'top-[27rem]' : 'top-40';

  return (
    <div
      className={`pointer-events-auto absolute left-4 z-20 w-[22rem] rounded-2xl border border-space-border bg-space-panel/94 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl ${topClass}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-space-dim">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            {site.agency} · {kindLabel}
          </div>
          <div className="mt-1 text-base font-semibold text-white">{site.name}</div>
          <div className="mt-1 text-[11px] text-space-dim">
            {formatDate(site.date)} · {formatLat(site.lat_deg)}, {formatLon(site.lon_deg)}
          </div>
        </div>
        <button
          onClick={() => clearSelection(null)}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
          aria-label="Clear surface site selection"
        >
          <X size={14} />
        </button>
      </header>

      <div className="px-4 py-4 text-[12px] leading-relaxed text-space-text">{site.summary}</div>

      <footer className="border-t border-white/5 px-4 py-3 text-[10px] leading-relaxed text-space-dim">
        Source: {site.source}
      </footer>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatLat(deg: number): string {
  return `${Math.abs(deg).toFixed(3)}° ${deg >= 0 ? 'N' : 'S'}`;
}

function formatLon(deg: number): string {
  const norm = ((deg + 540) % 360) - 180;
  return `${Math.abs(norm).toFixed(3)}° ${norm >= 0 ? 'E' : 'W'}`;
}
