import { create } from 'zustand';
import type {
  CatalogObjectType,
  ConjunctionResult,
  OrbitClass,
  PropagationSnapshot,
} from '@spacemap/shared';
import { CATALOG_OBJECT_TYPES, ORBIT_CLASSES } from '@spacemap/shared';

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TrailMode = 'off' | 'selected' | 'visible';
export type CameraMode = 'orbit' | 'follow' | 'pov';

export interface SatelliteIndexEntry {
  noradId: number;
  name: string;
  objectType: CatalogObjectType;
  orbitClass?: OrbitClass;
  owner?: string;
  sourcePriority?: number;
}

export type OverlayId = 'iss' | 'sky' | 'saved' | 'leaderboard' | 'launches';

interface StoreState {
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  catalogSize: number;
  catalogTargetCount: number;
  catalogHydrating: boolean;
  index: SatelliteIndexEntry[];
  indexByNorad: Map<number, string>;
  objectTypeByNorad: Map<number, CatalogObjectType>;

  snapshot: PropagationSnapshot | null;
  snapshotTick: number;

  imageryReady: boolean;
  firstSnapshotReceived: boolean;

  selectedNoradId: number | null;
  compareNoradId: number | null;
  pickCompareMode: boolean;
  conjunction: ConjunctionResult | null;
  conjunctionLoading: boolean;

  cameraMode: CameraMode;
  filter: Set<OrbitClass>;
  objectFilter: Set<CatalogObjectType>;
  trailMode: TrailMode;
  heatmapOn: boolean;
  terminatorOn: boolean;
  graticuleOn: boolean;
  countriesOn: boolean;
  citiesOn: boolean;
  groundStationsOn: boolean;
  imageryId: string;

  savedIds: Set<number>;
  notifyEnabled: boolean;
  openOverlays: Set<OverlayId>;

  simTimeMs: number;
  simMultiplier: number;
  simPaused: boolean;

  adminOpen: boolean;

  setCatalogStatus: (s: CatalogStatus, err?: string | null) => void;
  setIndex: (index: SatelliteIndexEntry[]) => void;
  appendIndex: (index: SatelliteIndexEntry[]) => void;
  setCatalogProgress: (loaded: number, total: number, hydrating: boolean) => void;
  setSnapshot: (snap: PropagationSnapshot) => void;
  setImageryReady: (v: boolean) => void;

  select: (id: number | null) => void;
  setCompare: (id: number | null) => void;
  setPickCompareMode: (v: boolean) => void;
  setConjunction: (r: ConjunctionResult | null, loading?: boolean) => void;

  setCameraMode: (m: CameraMode) => void;
  toggleOrbitFilter: (cls: OrbitClass) => void;
  setFilter: (classes: Iterable<OrbitClass>) => void;
  toggleObjectFilter: (kind: CatalogObjectType) => void;
  setObjectFilter: (kinds: Iterable<CatalogObjectType>) => void;
  setTrailMode: (mode: TrailMode) => void;
  setHeatmap: (v: boolean) => void;
  setTerminator: (v: boolean) => void;
  setGraticule: (v: boolean) => void;
  setCountries: (v: boolean) => void;
  setCities: (v: boolean) => void;
  setGroundStations: (v: boolean) => void;
  setImagery: (id: string) => void;

  toggleSaved: (id: number) => void;
  loadSaved: (ids: Iterable<number>) => void;
  setNotifyEnabled: (v: boolean) => void;
  toggleOverlay: (id: OverlayId) => void;
  setOverlay: (id: OverlayId, open: boolean) => void;

  setClock: (timeMs: number, multiplier: number, paused: boolean) => void;
  setAdminOpen: (v: boolean) => void;
}

const defaultFilter = new Set<OrbitClass>(ORBIT_CLASSES);
const defaultObjectFilter = new Set<CatalogObjectType>(
  CATALOG_OBJECT_TYPES.filter((kind) => kind !== 'debris'),
);

export const useStore = create<StoreState>((set) => ({
  catalogStatus: 'idle',
  catalogError: null,
  catalogSize: 0,
  catalogTargetCount: 0,
  catalogHydrating: false,
  index: [],
  indexByNorad: new Map(),
  objectTypeByNorad: new Map(),

  snapshot: null,
  snapshotTick: 0,
  imageryReady: false,
  firstSnapshotReceived: false,

  selectedNoradId: null,
  compareNoradId: null,
  pickCompareMode: false,
  conjunction: null,
  conjunctionLoading: false,

  cameraMode: 'orbit',
  filter: new Set(defaultFilter),
  objectFilter: new Set(defaultObjectFilter),
  trailMode: 'selected',
  heatmapOn: false,
  // Cartographic overlays default ON — they read as "professional map" and
  // users can flick them off from the filter panel if they want a clean look.
  terminatorOn: true,
  graticuleOn: true,
  countriesOn: true,
  citiesOn: true,
  groundStationsOn: false,
  imageryId: 'arcgis',

  savedIds: new Set(),
  notifyEnabled: false,
  openOverlays: new Set(),

  simTimeMs: Date.now(),
  simMultiplier: 1,
  simPaused: false,

  adminOpen: false,

  setCatalogStatus: (catalogStatus, err = null) => set({ catalogStatus, catalogError: err }),
  setIndex: (index) =>
    set({
      index,
      catalogSize: index.length,
      indexByNorad: new Map(index.map((e) => [e.noradId, e.name])),
      objectTypeByNorad: new Map(index.map((e) => [e.noradId, e.objectType])),
    }),
  appendIndex: (incoming) =>
    set((s) => {
      if (incoming.length === 0) return {};
      const index = [...s.index];
      const indexByNorad = new Map(s.indexByNorad);
      const objectTypeByNorad = new Map(s.objectTypeByNorad);
      const byNorad = new Map(index.map((entry, idx) => [entry.noradId, idx]));
      for (const entry of incoming) {
        const existingIdx = byNorad.get(entry.noradId);
        if (existingIdx == null) {
          byNorad.set(entry.noradId, index.length);
          index.push(entry);
          indexByNorad.set(entry.noradId, entry.name);
          objectTypeByNorad.set(entry.noradId, entry.objectType);
          continue;
        }
        const existing = index[existingIdx];
        if ((entry.sourcePriority ?? 0) >= (existing.sourcePriority ?? 0)) {
          index[existingIdx] = { ...existing, ...entry };
          indexByNorad.set(entry.noradId, entry.name);
          objectTypeByNorad.set(entry.noradId, entry.objectType);
        }
      }
      return {
        index,
        catalogSize: index.length,
        indexByNorad,
        objectTypeByNorad,
      };
    }),
  setCatalogProgress: (catalogSize, catalogTargetCount, catalogHydrating) =>
    set({ catalogSize, catalogTargetCount, catalogHydrating }),
  setSnapshot: (snap) =>
    set((s) => ({
      snapshot: snap,
      snapshotTick: s.snapshotTick + 1,
      firstSnapshotReceived: s.firstSnapshotReceived || snap.count > 0,
    })),
  setImageryReady: (imageryReady) => set({ imageryReady }),

  select: (id) =>
    set((s) => ({
      selectedNoradId: id,
      cameraMode: id == null ? 'orbit' : s.cameraMode,
      conjunction: null,
    })),
  setCompare: (id) =>
    set({
      compareNoradId: id,
      pickCompareMode: false,
      conjunction: null,
      conjunctionLoading: false,
    }),
  setPickCompareMode: (v) => set({ pickCompareMode: v }),
  setConjunction: (r, loading = false) => set({ conjunction: r, conjunctionLoading: loading }),

  setCameraMode: (m) => set({ cameraMode: m }),
  toggleOrbitFilter: (cls) =>
    set((s) => {
      const next = new Set(s.filter);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return { filter: next };
    }),
  setFilter: (classes) => set({ filter: new Set(classes) }),
  toggleObjectFilter: (kind) =>
    set((s) => {
      const next = new Set(s.objectFilter);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return { objectFilter: next };
    }),
  setObjectFilter: (kinds) => set({ objectFilter: new Set(kinds) }),
  setTrailMode: (trailMode) => set({ trailMode }),
  setHeatmap: (heatmapOn) => set({ heatmapOn }),
  setTerminator: (terminatorOn) => set({ terminatorOn }),
  setGraticule: (graticuleOn) => set({ graticuleOn }),
  setCountries: (countriesOn) => set({ countriesOn }),
  setCities: (citiesOn) => set({ citiesOn }),
  setGroundStations: (groundStationsOn) => set({ groundStationsOn }),
  setImagery: (imageryId) => set({ imageryId }),

  toggleSaved: (id) =>
    set((s) => {
      const next = new Set(s.savedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { savedIds: next };
    }),
  loadSaved: (ids) => set({ savedIds: new Set(ids) }),
  setNotifyEnabled: (notifyEnabled) => set({ notifyEnabled }),
  toggleOverlay: (id) =>
    set((s) => {
      // Only one right-rail overlay open at a time — opening a new one
      // implicitly closes whatever was open before, so panels never stack
      // on top of each other.
      if (s.openOverlays.has(id)) return { openOverlays: new Set() };
      return { openOverlays: new Set([id]) };
    }),
  setOverlay: (id, open) =>
    set((s) => {
      if (!open) {
        if (!s.openOverlays.has(id)) return {};
        const next = new Set(s.openOverlays);
        next.delete(id);
        return { openOverlays: next };
      }
      return { openOverlays: new Set([id]) };
    }),

  setClock: (simTimeMs, simMultiplier, simPaused) => set({ simTimeMs, simMultiplier, simPaused }),
  setAdminOpen: (adminOpen) => set({ adminOpen }),
}));
