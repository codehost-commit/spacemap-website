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

/**
 * Per-model render tuning. Different GLBs come out of Blender/nasa3d/Sketchfab
 * with wildly different intrinsic dimensions — some are modelled at ~10 m
 * (Starlink, hand-scanned), some at hundreds or thousands of metres (NASA
 * science instruments). We give each family its own `minimumPixelSize` +
 * `maximumScale` so nothing balloons when zoomed out.
 */
interface ModelSpec {
  url: string;
  /** On-screen pixel floor. Smaller = model shrinks more when far away. */
  minimumPixelSize: number;
  /** Cap on the auto-scale multiplier. Smaller = less inflation at distance. */
  maximumScale: number;
}

// The generic + big-natural-size models (payload, rocket body, debris,
// starlink) come from external sources with unpredictable base dimensions,
// so we give them tighter caps to prevent giant-sphere-in-space renders.
const TIGHT_TUNING = { minimumPixelSize: 96, maximumScale: 20_000 };
// The hand-tuned famous spacecraft assets (ISS/Hubble/JWST/Voyager) are known
// to be near real-world scale, so they get the traditional loose tuning that
// keeps them visible at any zoom.
const LOOSE_TUNING = { minimumPixelSize: 220, maximumScale: 800_000 };

const SPECIFIC_MODELS: Record<number, ModelSpec> = {
  25544: { url: MODEL_URL('iss.glb'), ...LOOSE_TUNING }, // ISS (ZARYA)
  20580: { url: MODEL_URL('hubble.glb'), ...LOOSE_TUNING }, // HUBBLE
  50463: { url: MODEL_URL('jwst.glb'), ...LOOSE_TUNING }, // JWST (L2 halo)
};

const NAME_PATTERN_MODELS: Array<{ test: (name: string) => boolean; spec: ModelSpec }> = [
  {
    test: (name) => name.startsWith('STARLINK'),
    spec: { url: MODEL_URL('starlink.glb'), ...TIGHT_TUNING },
  },
];

const TYPE_MODELS: Record<CatalogObjectType, ModelSpec> = {
  payload: { url: MODEL_URL('payload.glb'), ...TIGHT_TUNING },
  'rocket-body': { url: MODEL_URL('rocket-body.glb'), ...TIGHT_TUNING },
  debris: { url: MODEL_URL('debris.glb'), ...TIGHT_TUNING },
  unknown: { url: MODEL_URL('voyager.glb'), ...LOOSE_TUNING },
};

const GENERIC_SPEC: ModelSpec = { url: MODEL_URL('voyager.glb'), ...LOOSE_TUNING };

/**
 * URLs that have failed to load (shader compile errors, missing textures, etc.)
 * — we blacklist them so we don't keep retrying the same broken GLB every
 * time the user clicks another satellite of that type.
 */
const brokenModelUrls = new Set<string>();

export function modelSpecFor(noradId: number): ModelSpec {
  // Level 1 — hand-curated famous satellites.
  const specific = SPECIFIC_MODELS[noradId];
  if (specific && !brokenModelUrls.has(specific.url)) return specific;

  // Look up the catalog entry for name + type so we can match families and
  // categories. The store carries this via catalogEntryByNorad + indexByNorad.
  const state = useStore.getState();
  const entry = state.catalogEntryByNorad.get(noradId);
  const name = (entry?.name ?? state.indexByNorad.get(noradId) ?? '').toUpperCase();
  const objectType = entry?.objectType ?? state.objectTypeByNorad.get(noradId);

  // Level 2 — name-pattern families (Starlink, and easily extensible).
  for (const { test, spec } of NAME_PATTERN_MODELS) {
    if (test(name) && !brokenModelUrls.has(spec.url)) return spec;
  }

  // Level 3 — per-object-type fallback so a Falcon 9 upper stage never
  // renders as a Voyager probe.
  if (objectType) {
    const typeSpec = TYPE_MODELS[objectType];
    if (typeSpec && !brokenModelUrls.has(typeSpec.url)) return typeSpec;
  }

  // Level 4 — final fallback.
  return GENERIC_SPEC;
}

/** Back-compat: URL-only accessor. */
export function modelUrlFor(noradId: number): string {
  return modelSpecFor(noradId).url;
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

    await this.tryLoadModelFor(noradId, 0);
  }

  /**
   * Attempt to load the resolved model. If Cesium fails to compile the GLB
   * shader (which happens with GLBs that reference undeclared varyings like
   * `v_texCoord_0` when the mesh lacks UVs), blacklist the URL and try the
   * next fallback in the resolution chain. Prevents one bad asset from
   * breaking selection for an entire object type.
   */
  private async tryLoadModelFor(noradId: number, depth: number): Promise<void> {
    if (depth > 3) return; // guard against infinite fallback loops
    const spec = modelSpecFor(noradId);
    const url = spec.url;
    this.loadingUrl = url;
    let model: Cesium.Model | null = null;
    try {
      // Per-model tuning: ISS/Hubble/JWST get the loose "always visible"
      // treatment; the type-fallback GLBs get tighter caps so they don't
      // balloon at high altitudes.
      model = await Cesium.Model.fromGltfAsync({
        url,
        modelMatrix: Cesium.Matrix4.IDENTITY,
        minimumPixelSize: spec.minimumPixelSize,
        maximumScale: spec.maximumScale,
        scale: 1,
        show: false,
      });
    } catch (err) {
      console.warn('[satellite-model] failed to load', url, err);
      brokenModelUrls.add(url);
      // Try the next fallback (Voyager is the terminal generic).
      if (this.noradId === noradId) {
        await this.tryLoadModelFor(noradId, depth + 1);
      }
      return;
    }

    // Bail if the selection changed while the glTF was downloading.
    if (this.loadingUrl !== url || this.noradId !== noradId) {
      model.destroy?.();
      return;
    }

    // Cesium reports shader-compile failures asynchronously via the model's
    // `errorEvent` — a synchronous `fromGltfAsync` resolve does NOT catch them.
    // Hook the error event so a broken GLB is blacklisted and we transparently
    // fall back to the Voyager silhouette instead of crashing the render.
    const brokenUrl = url;
    const failedNoradId = noradId;
    model.errorEvent?.addEventListener?.((error: unknown) => {
      console.warn('[satellite-model] runtime error on', brokenUrl, error);
      brokenModelUrls.add(brokenUrl);
      if (this.model === model) {
        this.clearModel();
        // Retry with the next fallback if the user is still viewing this sat.
        if (this.noradId === failedNoradId) {
          void this.tryLoadModelFor(failedNoradId, depth + 1);
        }
      }
    });

    this.viewer.scene.primitives.add(model);
    this.model = model;
    // Kick one immediate transform so it appears at the satellite, not origin.
    this.updateTransform();
    model.show = !this.hidden;
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
