import { create } from 'zustand';
import type {
  CatalogObjectType,
  ConjunctionResult,
  OrbitClass,
  PropagationSnapshot,
} from '@spacemap/shared';
import { CATALOG_OBJECT_TYPES, ORBIT_CLASSES } from '@spacemap/shared';
import type { BodyId } from '../cesium/bodies.js';
import type { LunarOrbiterKind } from '../simulation/lunar-catalog.js';
import type { LunarSiteKind } from '../simulation/lunar-surface-catalog.js';

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TrailMode = 'off' | 'selected' | 'visible';
export type CameraMode = 'orbit' | 'follow' | 'pov';

export interface SatelliteIndexEntry {
  noradId: number;
  name: string;
  objectType: CatalogObjectType;
  orbitClass?: OrbitClass;
  owner?: string;
  launchDate?: string;
  decayDate?: string;
  propagatable?: boolean;
  sourcePriority?: number;
}

export type OverlayId = 'iss' | 'sky' | 'saved' | 'leaderboard' | 'launches' | 'passes';

interface StoreState {
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  catalogSize: number;
  catalogTargetCount: number;
  trackableCatalogSize: number;
  trackableTargetCount: number;
  catalogHydrating: boolean;
  index: SatelliteIndexEntry[];
  indexByNorad: Map<number, string>;
  objectTypeByNorad: Map<number, CatalogObjectType>;
  catalogEntryByNorad: Map<number, SatelliteIndexEntry>;

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
  cloudsOn: boolean;
  imageryId: string;

  // Beyond Earth — which body is the globe currently rendering.
  body: BodyId;

  // Lunar selection + filter (only meaningful when body === 'moon').
  // Keeping these separate from the Earth NORAD IDs avoids collisions and
  // makes it obvious at the type level which catalogue a piece of UI is
  // reading from.
  selectedLunarId: string | null;
  lunarKindFilter: Set<LunarOrbiterKind>;

  // Surface-marker layer (Part 3) — landers, Apollo sites, crashes, impacts.
  selectedLunarSurfaceId: string | null;
  lunarSurfaceKindFilter: Set<LunarSiteKind>;
  lunarSurfaceOn: boolean;

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
  setCatalogProgress: (
    loaded: number,
    total: number,
    trackableLoaded: number,
    trackableTotal: number,
    hydrating: boolean,
  ) => void;
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
  setClouds: (v: boolean) => void;
  setImagery: (id: string) => void;
  setBody: (b: BodyId) => void;
  setLunarSelection: (id: string | null) => void;
  toggleLunarKindFilter: (k: LunarOrbiterKind) => void;
  setLunarKindFilter: (k: Iterable<LunarOrbiterKind>) => void;
  setLunarSurfaceSelection: (id: string | null) => void;
  toggleLunarSurfaceKindFilter: (k: LunarSiteKind) => void;
  setLunarSurfaceKindFilter: (k: Iterable<LunarSiteKind>) => void;
  setLunarSurfaceOn: (v: boolean) => void;

  toggleSaved: (id: number) => void;
  loadSaved: (ids: Iterable<number>) => void;
  setNotifyEnabled: (v: boolean) => void;
  toggleOverlay: (id: OverlayId) => void;
  setOverlay: (id: OverlayId, open: boolean) => void;

  setClock: (timeMs: number, multiplier: number, paused: boolean) => void;
  setAdminOpen: (v: boolean) => void;
}

const defaultFilter = new Set<OrbitClass>(ORBIT_CLASSES);
const defaultObjectFilter = new Set<CatalogObjectType>(CATALOG_OBJECT_TYPES);
const defaultLunarKindFilter = new Set<LunarOrbiterKind>([
  'science',
  'relay',
  'nrho',
  'lander-support',
]);
const defaultLunarSurfaceKindFilter = new Set<LunarSiteKind>([
  'crewed',
  'lander',
  'crash',
  'impact',
]);

export const useStore = create<StoreState>((set) => ({
  catalogStatus: 'idle',
  catalogError: null,
  catalogSize: 0,
  catalogTargetCount: 0,
  trackableCatalogSize: 0,
  trackableTargetCount: 0,
  catalogHydrating: false,
  index: [],
  indexByNorad: new Map(),
  objectTypeByNorad: new Map(),
  catalogEntryByNorad: new Map(),

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
  terminatorOn: true,
  graticuleOn: true,
  countriesOn: true,
  citiesOn: true,
  groundStationsOn: false,
  cloudsOn: true,
  imageryId: 'arcgis',
  body: 'earth',

  selectedLunarId: null,
  lunarKindFilter: new Set(defaultLunarKindFilter),

  selectedLunarSurfaceId: null,
  lunarSurfaceKindFilter: new Set(defaultLunarSurfaceKindFilter),
  lunarSurfaceOn: true,

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
      catalogEntryByNorad: new Map(index.map((e) => [e.noradId, e])),
    }),
  appendIndex: (incoming) =>
    set((s) => {
      if (incoming.length === 0) return {};
      const index = [...s.index];
      const indexByNorad = new Map(s.indexByNorad);
      const objectTypeByNorad = new Map(s.objectTypeByNorad);
      const catalogEntryByNorad = new Map(s.catalogEntryByNorad);
      const byNorad = new Map(index.map((entry, idx) => [entry.noradId, idx]));
      for (const entry of incoming) {
        const existingIdx = byNorad.get(entry.noradId);
        if (existingIdx == null) {
          byNorad.set(entry.noradId, index.length);
          index.push(entry);
          indexByNorad.set(entry.noradId, entry.name);
          objectTypeByNorad.set(entry.noradId, entry.objectType);
          catalogEntryByNorad.set(entry.noradId, entry);
          continue;
        }
        const existing = index[existingIdx];
        if ((entry.sourcePriority ?? 0) >= (existing.sourcePriority ?? 0)) {
          const nextEntry = { ...existing, ...entry };
          index[existingIdx] = nextEntry;
          indexByNorad.set(entry.noradId, entry.name);
          objectTypeByNorad.set(entry.noradId, entry.objectType);
          catalogEntryByNorad.set(entry.noradId, nextEntry);
        }
      }
      return {
        index,
        catalogSize: index.length,
        indexByNorad,
        objectTypeByNorad,
        catalogEntryByNorad,
      };
    }),
  setCatalogProgress: (
    catalogSize,
    catalogTargetCount,
    trackableCatalogSize,
    trackableTargetCount,
    catalogHydrating,
  ) =>
    set({
      catalogSize,
      catalogTargetCount,
      trackableCatalogSize,
      trackableTargetCount,
      catalogHydrating,
    }),
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
  setClouds: (cloudsOn) => set({ cloudsOn }),
  setImagery: (imageryId) => set({ imageryId }),
  setBody: (body) =>
    set((s) => ({
      body,
      selectedNoradId: body === s.body ? s.selectedNoradId : null,
      compareNoradId: body === s.body ? s.compareNoradId : null,
      selectedLunarId: body === s.body ? s.selectedLunarId : null,
      selectedLunarSurfaceId: body === s.body ? s.selectedLunarSurfaceId : null,
      cameraMode: body === s.body ? s.cameraMode : 'orbit',
      imageryReady: body === s.body ? s.imageryReady : false,
    })),
  setLunarSelection: (id) => set({ selectedLunarId: id }),
  toggleLunarKindFilter: (kind) =>
    set((s) => {
      const next = new Set(s.lunarKindFilter);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return { lunarKindFilter: next };
    }),
  setLunarKindFilter: (kinds) => set({ lunarKindFilter: new Set(kinds) }),
  setLunarSurfaceSelection: (id) => set({ selectedLunarSurfaceId: id }),
  toggleLunarSurfaceKindFilter: (kind) =>
    set((s) => {
      const next = new Set(s.lunarSurfaceKindFilter);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return { lunarSurfaceKindFilter: next };
    }),
  setLunarSurfaceKindFilter: (kinds) => set({ lunarSurfaceKindFilter: new Set(kinds) }),
  setLunarSurfaceOn: (lunarSurfaceOn) => set({ lunarSurfaceOn }),

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
