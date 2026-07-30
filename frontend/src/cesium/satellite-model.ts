import * as Cesium from 'cesium';
import type { CatalogObjectType, PropagationSnapshot } from '@spacemap/shared';
import { useStore } from '../state/store.js';

/**
 * Model resolution priority:
 *   1. SPECIFIC_MODELS — famous individual spacecraft (ISS, Hubble, JWST) get
 *      their real 3-D scans.
 *   2. NAME_PATTERN_MODELS — well-known families identified by name prefix
 *      (Starlink, and easy to extend to GPS/GLONASS/etc later).
 *   3. TYPE_MODELS — per object-type fallback so every payload looks like a
 *      payload, every rocket body looks like a rocket body, and every debris
 *      piece looks like a fragment.
 *   4. Voyager silhouette as absolute last resort for uncategorised objects.
 *
 * All GLBs are lazy-loaded — the file only downloads the first time a user
 * selects a satellite that resolves to it.
 */
const MODEL_URL = (name: string) => `${import.meta.env.BASE_URL}models/${name}`;

const SPECIFIC_MODELS: Record<number, string> = {
  25544: MODEL_URL('iss.glb'), // ISS (ZARYA)
  20580: MODEL_URL('hubble.glb'), // HUBBLE SPACE TELESCOPE
  50463: MODEL_URL('jwst.glb'), // JAMES WEBB SPACE TELESCOPE (L2 halo)
};

const NAME_PATTERN_MODELS: Array<{ test: (name: string) => boolean; url: string }> = [
  {
    test: (name) => name.startsWith('STARLINK'),
    url: MODEL_URL('starlink.glb'),
  },
];

const TYPE_MODELS: Record<CatalogObjectType, string> = {
  payload: MODEL_URL('payload.glb'),
  'rocket-body': MODEL_URL('rocket-body.glb'),
  debris: MODEL_URL('debris.glb'),
  unknown: MODEL_URL('voyager.glb'),
};

const GENERIC_MODEL = MODEL_URL('voyager.glb');

export function modelUrlFor(noradId: number): string {
  // Level 1 — hand-curated famous satellites.
  const specific = SPECIFIC_MODELS[noradId];
  if (specific) return specific;

  // Look up the catalog entry for name + type so we can match families and
  // categories. The store carries this via catalogEntryByNorad + indexByNorad.
  const state = useStore.getState();
  const entry = state.catalogEntryByNorad.get(noradId);
  const name = (entry?.name ?? state.indexByNorad.get(noradId) ?? '').toUpperCase();
  const objectType = entry?.objectType ?? state.objectTypeByNorad.get(noradId);

  // Level 2 — name-pattern families (Starlink, and easily extensible).
  for (const { test, url } of NAME_PATTERN_MODELS) {
    if (test(name)) return url;
  }

  // Level 3 — per-object-type fallback so a Falcon 9 upper stage never
  // renders as a Voyager probe.
  if (objectType && TYPE_MODELS[objectType]) return TYPE_MODELS[objectType];

  // Level 4 — final fallback.
  return GENERIC_MODEL;
}

export function isSpecificModel(noradId: number): boolean {
  return noradId in SPECIFIC_MODELS;
}

/**
 * Renders a single glTF model for the currently-selected satellite. Model is
 * loaded on demand, positioned + oriented every frame from the propagator
 * snapshot (motion-aligned so the +X axis points along velocity). Uses
 * `minimumPixelSize` so the model is always visible regardless of camera
 * distance, but a max scale caps runaway zoom-in inflation.
 */
export class SatelliteModel {
  private model: Cesium.Model | null = null;
  private noradId: number | null = null;
  private hidden = false;
  private preRenderDispose: (() => void) | null = null;
  private loadingUrl: string | null = null;
  /** Cached snapshot timeMs so we can detect stale snapshots and interpolate. */
  private lastSnapTimeMs = -1;
  private lastSnapWallMs = 0;
  private lastPx = 0;
  private lastPy = 0;
  private lastPz = 0;
  private lastVx = 0;
  private lastVy = 0;
  private lastVz = 0;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly getSnapshot: () => PropagationSnapshot | null,
  ) {
    // One preRender listener drives all model updates.
    this.preRenderDispose = this.viewer.scene.preRender.addEventListener(() =>
      this.updateTransform(),
    );
  }

  async setFor(noradId: number | null): Promise<void> {
    if (noradId === this.noradId) return;
    this.noradId = noradId;
    // Reset interpolation state so we don't extrapolate from the previous
    // satellite's cached position/velocity while the new GLB loads.
    this.lastSnapTimeMs = -1;
    this.lastSnapWallMs = 0;
    this.clearModel();
    if (noradId == null) return;

    const url = modelUrlFor(noradId);
    this.loadingUrl = url;
    try {
      // Real satellite sizes (ISS ~100 m, cubesat ~0.3 m) are invisible dots
      // at typical camera distances (500+ km). `minimumPixelSize: 220` clamps
      // the on-screen footprint so you actually see the model shape. It still
      // shrinks nicely when you fly close and cross the natural-scale
      // threshold.
      const model = await Cesium.Model.fromGltfAsync({
        url,
        modelMatrix: Cesium.Matrix4.IDENTITY,
        minimumPixelSize: 220,
        maximumScale: 800_000,
        scale: 1,
        // Hide until first transform update so the model doesn't flash at the
        // origin.
        show: false,
      });
      // Bail if the selection changed while the glTF was downloading.
      if (this.loadingUrl !== url || this.noradId !== noradId) {
        model.destroy?.();
        return;
      }
      this.viewer.scene.primitives.add(model);
      this.model = model;
      // Kick one immediate transform so it appears at the satellite, not the
      // origin.
      this.updateTransform();
      model.show = !this.hidden;
    } catch (err) {
      console.warn('[satellite-model] failed to load', url, err);
    }
  }

  /** POV of self hides the model to avoid rendering the inside of the mesh. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (this.model) this.model.show = !hidden;
  }

  destroy(): void {
    this.preRenderDispose?.();
    this.preRenderDispose = null;
    this.clearModel();
    this.noradId = null;
  }

  private clearModel(): void {
    if (this.model) {
      try {
        this.viewer.scene.primitives.remove(this.model);
      } catch {
        /* viewer torn down */
      }
      this.model = null;
    }
    this.loadingUrl = null;
  }

  private updateTransform(): void {
    if (!this.model || this.noradId == null) return;
    const snap = this.getSnapshot();
    if (!snap) return;
    let i = -1;
    for (let k = 0; k < snap.count; k++) {
      if (snap.ids[k] === this.noradId) {
        i = k;
        break;
      }
    }
    if (i < 0) return;

    const nowWall = performance.now();
    let px: number;
    let py: number;
    let pz: number;
    let vx: number;
    let vy: number;
    let vz: number;

    if (snap.timeMs !== this.lastSnapTimeMs) {
      // New snapshot arrived — latch base values.
      this.lastSnapTimeMs = snap.timeMs;
      this.lastSnapWallMs = nowWall;
      this.lastPx = snap.ecefPos[i * 3];
      this.lastPy = snap.ecefPos[i * 3 + 1];
      this.lastPz = snap.ecefPos[i * 3 + 2];
      this.lastVx = snap.ecefVel[i * 3];
      this.lastVy = snap.ecefVel[i * 3 + 1];
      this.lastVz = snap.ecefVel[i * 3 + 2];
      px = this.lastPx;
      py = this.lastPy;
      pz = this.lastPz;
    } else {
      // Same snapshot — interpolate forward using velocity (m/s → m).
      const dtSec = (nowWall - this.lastSnapWallMs) / 1000;
      px = this.lastPx + this.lastVx * dtSec;
      py = this.lastPy + this.lastVy * dtSec;
      pz = this.lastPz + this.lastVz * dtSec;
    }
    vx = this.lastVx;
    vy = this.lastVy;
    vz = this.lastVz;

    const position = new Cesium.Cartesian3(px, py, pz);
    // Build a local ENU frame, then compute heading from velocity so +X of the
    // model points along the direction of motion.
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const enuInverse = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
    const velEnu = Cesium.Matrix4.multiplyByPointAsVector(
      enuInverse,
      new Cesium.Cartesian3(vx, vy, vz),
      new Cesium.Cartesian3(),
    );
    // ENU uses east=X, north=Y; heading is measured clockwise from north.
    const heading = Math.atan2(velEnu.x, velEnu.y);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const matrix = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
    Cesium.Matrix4.clone(matrix, this.model.modelMatrix);
    if (!this.hidden && !this.model.show) this.model.show = true;
  }
}
