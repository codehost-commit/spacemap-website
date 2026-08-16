import * as Cesium from 'cesium';
import { sunDirectionMoonFixed } from '../simulation/lunar-propagator.js';

/**
 * The great-circle line on the Moon where the sun sits exactly on the
 * horizon — the boundary between the illuminated near side and the
 * shadowed side. Cesium's SunLight already shades the globe correctly;
 * this class overlays the terminator LINE so time-warping the clock
 * shows the day/night boundary sweeping visibly across the surface.
 *
 * Same construction as the Earth Terminator (perpendicular vectors u, v
 * spanning the plane whose normal is the sun direction, then a full
 * circle sampled around the ellipsoid), just re-anchored to Moon radius
 * and to the sun-direction-from-Moon vector.
 */
const REFRESH_MS = 6000;
const SAMPLES = 180;
const MOON_R_M = 1_737_400 + 2000; // surface + tiny lift to dodge z-fighting

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

    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const sun = sunDirectionMoonFixed(date);

    // Two perpendicular unit vectors in the plane whose normal is `sun`.
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
        width: 1.5,
        material: Cesium.Material.fromType('Color', {
          // Warmer amber than Earth's — reads as "lunar dawn / dusk".
          color: new Cesium.Color(1, 0.75, 0.35, 0.85),
        }),
      });
    } else {
      this.polyline.positions = positions;
    }
  }
}
