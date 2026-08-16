import * as Cesium from 'cesium';

/**
 * The great-circle line on the Moon where the sun sits exactly on the
 * horizon — the boundary between the illuminated near side and the
 * shadowed side. Cesium's SunLight already shades the globe based on the
 * ICRF sun position; this class overlays the terminator LINE so
 * time-warping the clock shows the day/night boundary sweeping visibly
 * across the surface.
 *
 * Frame note: Cesium doesn't know a rotation model for our custom Moon
 * ellipsoid, so its shading effectively treats body-fixed positions as
 * inertial for the purpose of applying the sun direction. To make the
 * terminator LINE overlay the actual bright/dark boundary Cesium is
 * drawing, we build the ring using the INERTIAL sun direction (not the
 * Moon-fixed one) — anything else would leave the line offset by the
 * current Moon rotation angle, which drifts ~13°/day.
 *
 * Visual choices: lifted 15 km above the surface so it never z-fights
 * with the LRO WAC tiles, drawn at 3 px in warm amber that pops against
 * both the sunlit greys and the dark side.
 */
const REFRESH_MS = 4000;
const SAMPLES = 200;
const MOON_R_M = 1_737_400 + 15_000; // surface + 15 km — well clear of z-fight

export class LunarTerminator {
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

    // Use the SAME sun direction Cesium's SunLight is applying to the
    // tileset — reading scene.light.direction guarantees the terminator
    // ring and the visible day/night boundary can't drift apart, no matter
    // which frame the underlying tileset ended up in.
    const light = this.scene.light?.direction ?? new Cesium.Cartesian3(1, 0, 0);
    const sun = { x: light.x, y: light.y, z: light.z };

    // Two perpendicular unit vectors spanning the plane whose normal is
    // the sun direction. Pick a helper axis that's ~perpendicular to sun
    // to avoid a near-zero cross-product.
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
      const cx = Math.cos(t) * MOON_R_M;
      const cy = Math.sin(t) * MOON_R_M;
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
          // Bright warm amber that reads as "lunar dawn/dusk" against
          // both the sunlit grey and the shadowed dark side.
          color: new Cesium.Color(1, 0.72, 0.28, 1),
          glowPower: 0.25,
          taperPower: 1,
        }),
      });
    } else {
      this.polyline.positions = positions;
    }
  }
}
