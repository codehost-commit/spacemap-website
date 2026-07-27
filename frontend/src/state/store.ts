import { create } from "zustand";
import type {
  ConjunctionResult,
  OrbitClass,
  PropagationSnapshot,
} from "@spacemap/shared";
import { ORBIT_CLASSES } from "@spacemap/shared";

export type CatalogStatus = "idle" | "loading" | "ready" | "error";
export type TrailMode = "off" | "selected" | "visible";
export type CameraMode = "orbit" | "follow" | "pov";

export interface SatelliteIndexEntry {
  noradId: number;
  name: string;
}

export type OverlayId = "iss" | "sky" | "saved" | "leaderboard";

interface StoreState {
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  catalogSize: number;
  index: SatelliteIndexEntry[];
  indexByNorad: Map<number, string>;

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
  trailMode: TrailMode;
  heatmapOn: boolean;
  terminatorOn: boolean;
  graticuleOn: boolean;
  countriesOn: boolean;
  citiesOn: boolean;
  imageryId: string;

  savedIds: Set<number>;
  notifyEnabled: boolean;
  openOverlays: Set<OverlayId>;

  simTimeMs: number;
  simMultiplier: number;
  simPaused: boolean;

  setCatalogStatus: (s: CatalogStatus, err?: string | null) => void;
  setIndex: (index: SatelliteIndexEntry[]) => void;
  setSnapshot: (snap: PropagationSnapshot) => void;
  setImageryReady: (v: boolean) => void;

  select: (id: number | null) => void;
  setCompare: (id: number | null) => void;
  setPickCompareMode: (v: boolean) => void;
  setConjunction: (r: ConjunctionResult | null, loading?: boolean) => void;

  setCameraMode: (m: CameraMode) => void;
  toggleOrbitFilter: (cls: OrbitClass) => void;
  setFilter: (classes: Iterable<OrbitClass>) => void;
  setTrailMode: (mode: TrailMode) => void;
  setHeatmap: (v: boolean) => void;
  setTerminator: (v: boolean) => void;
  setGraticule: (v: boolean) => void;
  setCountries: (v: boolean) => void;
  setCities: (v: boolean) => void;
  setImagery: (id: string) => void;

  toggleSaved: (id: number) => void;
  loadSaved: (ids: Iterable<number>) => void;
  setNotifyEnabled: (v: boolean) => void;
  toggleOverlay: (id: OverlayId) => void;
  setOverlay: (id: OverlayId, open: boolean) => void;

  setClock: (timeMs: number, multiplier: number, paused: boolean) => void;
}

const defaultFilter = new Set<OrbitClass>(ORBIT_CLASSES);

export const useStore = create<StoreState>((set) => ({
  catalogStatus: "idle",
  catalogError: null,
  catalogSize: 0,
  index: [],
  indexByNorad: new Map(),

  snapshot: null,
  snapshotTick: 0,
  imageryReady: false,
  firstSnapshotReceived: false,

  selectedNoradId: null,
  compareNoradId: null,
  pickCompareMode: false,
  conjunction: null,
  conjunctionLoading: false,

  cameraMode: "orbit",
  filter: new Set(defaultFilter),
  trailMode: "selected",
  heatmapOn: false,
  // Cartographic overlays default ON — they read as "professional map" and
  // users can flick them off from the filter panel if they want a clean look.
  terminatorOn: true,
  graticuleOn: true,
  countriesOn: true,
  citiesOn: true,
  imageryId: "arcgis",

  savedIds: new Set(),
  notifyEnabled: false,
  openOverlays: new Set(),

  simTimeMs: Date.now(),
  simMultiplier: 1,
  simPaused: false,

  setCatalogStatus: (catalogStatus, err = null) => set({ catalogStatus, catalogError: err }),
  setIndex: (index) =>
    set({
      index,
      catalogSize: index.length,
      indexByNorad: new Map(index.map((e) => [e.noradId, e.name])),
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
      cameraMode: id == null ? "orbit" : s.cameraMode,
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
  setConjunction: (r, loading = false) =>
    set({ conjunction: r, conjunctionLoading: loading }),

  setCameraMode: (m) => set({ cameraMode: m }),
  toggleOrbitFilter: (cls) =>
    set((s) => {
      const next = new Set(s.filter);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return { filter: next };
    }),
  setFilter: (classes) => set({ filter: new Set(classes) }),
  setTrailMode: (trailMode) => set({ trailMode }),
  setHeatmap: (heatmapOn) => set({ heatmapOn }),
  setTerminator: (terminatorOn) => set({ terminatorOn }),
  setGraticule: (graticuleOn) => set({ graticuleOn }),
  setCountries: (countriesOn) => set({ countriesOn }),
  setCities: (citiesOn) => set({ citiesOn }),
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
      const next = new Set(s.openOverlays);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { openOverlays: next };
    }),
  setOverlay: (id, open) =>
    set((s) => {
      const next = new Set(s.openOverlays);
      if (open) next.add(id);
      else next.delete(id);
      return { openOverlays: next };
    }),

  setClock: (simTimeMs, simMultiplier, simPaused) =>
    set({ simTimeMs, simMultiplier, simPaused }),
}));
