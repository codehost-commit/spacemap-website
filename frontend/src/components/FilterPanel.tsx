import {
  CATALOG_OBJECT_TYPES,
  CATALOG_OBJECT_TYPE_COLOR,
  CATALOG_OBJECT_TYPE_LABEL,
  ORBIT_CLASSES,
  ORBIT_CLASS_COLOR,
  type CatalogObjectType,
  type OrbitClass,
} from '@spacemap/shared';
import { buildObjectMarkerIcon } from '../cesium/satellite-icon.js';
import { useStore, type TrailMode } from '../state/store.js';
import { ImageryPicker } from './ImageryPicker.js';

const LABELS: Record<OrbitClass, string> = {
  LEO: 'LEO',
  MEO: 'MEO',
  GEO: 'GEO',
  HEO: 'HEO',
  POLAR: 'Polar',
  SSO: 'Sun-sync',
  UNKNOWN: 'Other',
};

const TRAIL_LABEL: Record<TrailMode, string> = {
  off: 'Off',
  selected: 'Selected',
  visible: 'Visible',
};

const OBJECT_MARKER_ICON: Record<CatalogObjectType, string> = {
  payload: buildObjectMarkerIcon('payload'),
  'rocket-body': buildObjectMarkerIcon('rocket-body'),
  debris: buildObjectMarkerIcon('debris'),
  unknown: buildObjectMarkerIcon('unknown'),
};

export function FilterPanel() {
  const filter = useStore((s) => s.filter);
  const toggle = useStore((s) => s.toggleOrbitFilter);
  const setFilter = useStore((s) => s.setFilter);
  const objectFilter = useStore((s) => s.objectFilter);
  const toggleObjectFilter = useStore((s) => s.toggleObjectFilter);
  const setObjectFilter = useStore((s) => s.setObjectFilter);
  const trailMode = useStore((s) => s.trailMode);
  const setTrailMode = useStore((s) => s.setTrailMode);
  const heatmapOn = useStore((s) => s.heatmapOn);
  const setHeatmap = useStore((s) => s.setHeatmap);
  const terminatorOn = useStore((s) => s.terminatorOn);
  const setTerminator = useStore((s) => s.setTerminator);
  const graticuleOn = useStore((s) => s.graticuleOn);
  const setGraticule = useStore((s) => s.setGraticule);
  const countriesOn = useStore((s) => s.countriesOn);
  const setCountries = useStore((s) => s.setCountries);
  const citiesOn = useStore((s) => s.citiesOn);
  const setCities = useStore((s) => s.setCities);
  const groundStationsOn = useStore((s) => s.groundStationsOn);
  const setGroundStations = useStore((s) => s.setGroundStations);
  const cloudsOn = useStore((s) => s.cloudsOn);
  const setClouds = useStore((s) => s.setClouds);

  return (
    <aside className="spacemap-filter pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-2xl border border-space-border bg-space-panel/92 p-3 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <ImageryPicker />
      <SectionHeader
        label="Object type"
        action={
          <button
            onClick={() =>
              setObjectFilter(
                objectFilter.size === CATALOG_OBJECT_TYPES.length
                  ? ['payload', 'rocket-body', 'unknown']
                  : CATALOG_OBJECT_TYPES,
              )
            }
            className="text-space-dim hover:text-space-text"
          >
            {objectFilter.size === CATALOG_OBJECT_TYPES.length ? 'Default' : 'All'}
          </button>
        }
      />
      <div className="mb-4 space-y-1">
        {CATALOG_OBJECT_TYPES.map((kind) => {
          const active = objectFilter.has(kind);
          return (
            <label
              key={kind}
              className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5 ${
                active ? 'text-space-text' : 'text-space-dim line-through'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleObjectFilter(kind)}
                className="h-3 w-3 accent-space-accent"
              />
              <span
                className="h-4 w-4 shrink-0"
                style={{
                  backgroundColor: CATALOG_OBJECT_TYPE_COLOR[kind],
                  WebkitMaskImage: `url(${OBJECT_MARKER_ICON[kind]})`,
                  maskImage: `url(${OBJECT_MARKER_ICON[kind]})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  filter: active
                    ? `drop-shadow(0 0 4px ${CATALOG_OBJECT_TYPE_COLOR[kind]}) drop-shadow(0 0 10px ${CATALOG_OBJECT_TYPE_COLOR[kind]})`
                    : 'none',
                  opacity: active ? 1 : 0.72,
                }}
              />
              <span>{CATALOG_OBJECT_TYPE_LABEL[kind]}</span>
            </label>
          );
        })}
      </div>

      <SectionHeader
        label="Orbit class"
        action={
          <button
            onClick={() => setFilter(filter.size === ORBIT_CLASSES.length ? [] : ORBIT_CLASSES)}
            className="text-space-dim hover:text-space-text"
          >
            {filter.size === ORBIT_CLASSES.length ? 'None' : 'All'}
          </button>
        }
      />
      <div className="mb-4 space-y-1">
        {ORBIT_CLASSES.map((cls) => {
          const active = filter.has(cls);
          return (
            <label
              key={cls}
              className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5 ${
                active ? 'text-space-text' : 'text-space-dim line-through'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(cls)}
                className="h-3 w-3 accent-space-accent"
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: ORBIT_CLASS_COLOR[cls],
                  boxShadow: active ? `0 0 6px ${ORBIT_CLASS_COLOR[cls]}` : 'none',
                }}
              />
              <span>{LABELS[cls]}</span>
            </label>
          );
        })}
      </div>

      <SectionHeader label="Trails" />
      <div className="mb-4 flex gap-1">
        {(['off', 'selected', 'visible'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTrailMode(mode)}
            className={`flex-1 rounded border px-2 py-1 ${
              trailMode === mode
                ? 'border-space-accent bg-space-accent/10 text-space-accent'
                : 'border-space-border text-space-dim hover:text-space-text'
            }`}
          >
            {TRAIL_LABEL[mode]}
          </button>
        ))}
      </div>

      <SectionHeader label="Overlays" />
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={heatmapOn}
          onChange={(e) => setHeatmap(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Density heatmap</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={terminatorOn}
          onChange={(e) => setTerminator(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Solar terminator</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={graticuleOn}
          onChange={(e) => setGraticule(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Lat / lon grid</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={countriesOn}
          onChange={(e) => setCountries(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Country borders</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={citiesOn}
          onChange={(e) => setCities(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Major cities</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={groundStationsOn}
          onChange={(e) => setGroundStations(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Ground stations</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={cloudsOn}
          onChange={(e) => setClouds(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Cloud cover (MODIS)</span>
      </label>
    </aside>
  );
}

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
      <span>{label}</span>
      {action}
    </div>
  );
}
