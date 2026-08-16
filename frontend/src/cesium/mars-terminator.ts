import * as Cesium from 'cesium';

/**
 * Solar terminator ring for Mars — same construction as LunarTerminator,
 * scaled to Mars radius. The great circle where the sun sits exactly on
 * the horizon: everything on the sunlit side of it is in Martian daytime,
 * everything on the far side is in the pre-dawn/post-sunset cold.
 *
 * Uses `scene.light.direction` directly so the ring can't drift out of
 * sync with whatever frame Cesium is actually shading against — the same
 * technique that fixed the Moon terminator drift.
 */
const REFRESH_MS = 4000;
const SAMPLES = 240;
const MARS_R_M = 3_389_500 + 20_000; // surface + 20 km — clear of any relief

export class MarsTerminator {
  private polyline: Cesium.Polyline | null = null;
  private collection: Cesium.PolylineCollection | null = null;
  private lastBuildMs = 0;
  private enabled = false;
  private tickDispose: (() => void) | null = null;
  private readonly scene: Cesium.Scene;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.scene = viewer.scene;
  }

  setEnabled(v: boolean): void {
    if (v === this.enabled) return;
    this.enabled = v;
    if (!v) {
      this.clear();
      return;
    }
    this.collection = this.scene.primitives.add(new Cesium.PolylineCollection());
    this.lastBuildMs = 0;
    this.tickDispose = this.scene.preRender.addEventListener(() => this.maybeRebuild());
    this.maybeRebuild();
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    this.clear();
  }

  private clear(): void {
    if (this.collection) {
      try {
        this.scene.primitives.remove(this.collection);
      } catch {
        /* viewer torn down */
      }
      this.collection = null;
    }
    this.polyline = null;
  }

  private maybeRebuild(): void {
    if (!this.enabled || !this.collection) return;
    const now = performance.now();
    if (now - this.lastBuildMs < REFRESH_MS) return;
    this.lastBuildMs = now;

    // Sun direction Cesium is actually shading with — reading it here
    // guarantees our ring and the scene's day/night boundary agree.
    // Cesium's base Light type doesn't declare `direction`; every concrete
    // subclass does. Cast through unknown to satisfy the type checker.
    const sceneLight = this.scene.light as unknown as { direction?: Cesium.Cartesian3 } | undefined;
    const light = sceneLight?.direction ?? new Cesium.Cartesian3(1, 0, 0);
    const sun = { x: light.x, y: light.y, z: light.z };

    const helper =
      Math.abs(sun.z) < 0.9 ? new Cesium.Cartesian3(0, 0, 1) : new Cesium.Cartesian3(1, 0, 0);
    const sunV = new Cesium.Cartesian3(sun.x, sun.y, sun.z);
    const u = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(sunV, helper, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const v = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(sunV, u, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );

    const positions: Cesium.Cartesian3[] = new Array(SAMPLES + 1);
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i * 2 * Math.PI) / SAMPLES;
      const cx = Math.cos(t) * MARS_R_M;
      const cy = Math.sin(t) * MARS_R_M;
      positions[i] = new Cesium.Cartesian3(
        cx * u.x + cy * v.x,
        cx * u.y + cy * v.y,
        cx * u.z + cy * v.z,
      );
    }

    if (!this.polyline) {
      this.polyline = this.collection.add({
        positions,
        width: 3,
        material: Cesium.Material.fromType('PolylineGlow', {
          // Warm dawn/dusk amber, tinted slightly redder than the Moon
          // terminator so the two read as distinct at a glance.
          color: new Cesium.Color(1, 0.55, 0.25, 1),
          glowPower: 0.28,
          taperPower: 1,
        }),
      });
    } else {
      this.polyline.positions = positions;
    }
  }
}
