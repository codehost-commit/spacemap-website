import * as Cesium from 'cesium';
import type { PropagationSnapshot } from '@spacemap/shared';

/**
 * Registry: which NORAD id gets which GLB. Anything not listed falls back to
 * a generic spacecraft silhouette (Voyager) so the user always gets a 3-D
 * shape when they select something. Loaded lazily on first use so the initial
 * page load doesn't pay for a satellite the user never selects.
 */
const MODEL_URL = (name: string) => `${import.meta.env.BASE_URL}models/${name}`;

const SPECIFIC_MODELS: Record<number, string> = {
  25544: MODEL_URL('iss.glb'), // ISS (ZARYA)
  20580: MODEL_URL('hubble.glb'), // HUBBLE SPACE TELESCOPE
  50463: MODEL_URL('jwst.glb'), // JAMES WEBB SPACE TELESCOPE (L2 halo)
};

const GENERIC_MODEL = MODEL_URL('voyager.glb');

export function modelUrlFor(noradId: number): string {
  return SPECIFIC_MODELS[noradId] ?? GENERIC_MODEL;
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

    const px = snap.ecefPos[i * 3];
    const py = snap.ecefPos[i * 3 + 1];
    const pz = snap.ecefPos[i * 3 + 2];
    const vx = snap.ecefVel[i * 3];
    const vy = snap.ecefVel[i * 3 + 1];
    const vz = snap.ecefVel[i * 3 + 2];

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
