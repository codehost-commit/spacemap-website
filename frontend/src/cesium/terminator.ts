import * as Cesium from 'cesium';

/**
 * Draws the solar terminator — the great circle on Earth's surface where the
 * sun is exactly on the horizon. Recomputed every REFRESH_MS from the sun's
 * ECI direction; that keeps it visibly moving as time advances (especially
 * satisfying at 100×+ time warp).
 */
const REFRESH_MS = 4000;
const SAMPLES = 180;
const EARTH_R = 6_378_137 + 2000; // metres — surface + tiny lift so it doesn't z-fight

export class Terminator {
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

    const currentTime = this.viewer.clock.currentTime;
    const date = Cesium.JulianDate.toDate(currentTime);
    const sunEcef = sunDirectionEcef(date);

    // Two perpendicular unit vectors spanning the plane whose normal is sunEcef.
    const helper: Cesium.Cartesian3 =
      Math.abs(sunEcef.z) < 0.9 ? new Cesium.Cartesian3(0, 0, 1) : new Cesium.Cartesian3(1, 0, 0);
    const u = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(sunEcef, helper, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const v = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(sunEcef, u, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );

    const positions: Cesium.Cartesian3[] = new Array(SAMPLES + 1);
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i * 2 * Math.PI) / SAMPLES;
      const cx = Math.cos(t) * EARTH_R;
      const cy = Math.sin(t) * EARTH_R;
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
          color: new Cesium.Color(1, 0.85, 0.4, 0.85),
        }),
      });
    } else {
      this.polyline.positions = positions;
    }
  }
}

/**
 * Low-precision solar position (good to ~0.01°). Same routine used by the
 * telemetry sunlit check — kept local to avoid a dependency between modules.
 * Returns a unit vector in ECEF pointing from Earth to Sun.
 */
function sunDirectionEcef(date: Date): Cesium.Cartesian3 {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) * Math.PI) / 180;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  const lambda = L + ((1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const eps = (23.439 * Math.PI) / 180;
  // Sun direction in ECI (rectangular).
  const ex = Math.cos(lambda);
  const ey = Math.cos(eps) * Math.sin(lambda);
  const ez = Math.sin(eps) * Math.sin(lambda);
  // ECI → ECEF: Z-rotation by -GMST.
  const gmst = greenwichSiderealTime(jd);
  const cosG = Math.cos(gmst);
  const sinG = Math.sin(gmst);
  return new Cesium.Cartesian3(cosG * ex + sinG * ey, -sinG * ex + cosG * ey, ez);
}

/** Greenwich Mean Sidereal Time in radians, from Julian Date. */
function greenwichSiderealTime(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let gmstDeg =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38_710_000;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  return (gmstDeg * Math.PI) / 180;
}
