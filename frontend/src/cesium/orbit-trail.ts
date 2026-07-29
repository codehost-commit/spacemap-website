import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import { ORBIT_CLASS_COLOR, classifyOrbit, type OrbitClass, type Tle } from '@spacemap/shared';
import { catalogObjectToSatRec } from '../simulation/catalog-satrec.js';

/**
 * Selected-satellite orbit ribbon. Rendered as a clean ellipse in the CURRENT
 * Earth-fixed frame — samples ECI positions along the orbit, then rotates
 * every sample to ECEF using the *same* GMST (now). This is different from a
 * ground track (each sample at its own GMST); the difference is why previous
 * versions looked "slanted" or "off" in Follow/Orbit view.
 *
 * The ribbon uses per-vertex color to fade from opaque at the satellite to
 * transparent one full period behind — a proper trailing glow. We rebuild
 * the polyline periodically because the ECI orbit is inertial while the
 * ECEF frame rotates with Earth, so the shape drifts if not refreshed.
 */
const REFRESH_MS = 750;
const SAMPLES = 200;

export class OrbitTrail {
  private polyline: Cesium.Primitive | null = null;
  private tle: Tle | null = null;
  private lastBuildMs = 0;
  private tickDispose: (() => void) | null = null;

  constructor(private readonly scene: Cesium.Scene) {
    this.tickDispose = this.scene.preRender.addEventListener(() => this.maybeRebuild());
  }

  setFromTle(tle: Tle | null): void {
    this.tle = tle;
    if (!tle) {
      this.clear();
      return;
    }
    // Force an immediate build so the ribbon appears the instant the user
    // selects a satellite.
    this.lastBuildMs = 0;
    this.rebuild();
  }

  clear(): void {
    if (this.polyline) {
      this.scene.primitives.remove(this.polyline);
      this.polyline = null;
    }
    this.tle = null;
    this.lastBuildMs = 0;
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    this.clear();
  }

  private maybeRebuild(): void {
    if (!this.tle) return;
    const now = performance.now();
    if (now - this.lastBuildMs < REFRESH_MS) return;
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.tle) return;
    const tle = this.tle;
    const satrec = catalogObjectToSatRec(tle);
    if (!satrec) return;

    const meanMotionRevPerDay = (satrec.no * 60 * 24) / (2 * Math.PI);
    if (!Number.isFinite(meanMotionRevPerDay) || meanMotionRevPerDay <= 0) return;
    const periodMin = 1440 / meanMotionRevPerDay;
    // Trail is one full orbital period BEHIND (past → present) so the head
    // sits on the satellite itself.
    const spanMs = Math.min(periodMin, 12 * 60) * 60_000; // capped at 12h
    const dtMs = spanMs / (SAMPLES - 1);
    const now = new Date();
    const startMs = now.getTime() - spanMs;

    // Rotate every ECI sample to the CURRENT frame using now-GMST.
    const nowGmst = satellite.gstime(now);
    const cosG = Math.cos(nowGmst);
    const sinG = Math.sin(nowGmst);

    const positions: Cesium.Cartesian3[] = [];
    const colors: Cesium.Color[] = [];
    let orbitClass: OrbitClass = 'UNKNOWN';
    let orbitHueRgb: [number, number, number] | null = null;

    for (let i = 0; i < SAMPLES; i++) {
      const t = new Date(startMs + i * dtMs);
      const pv = satellite.propagate(satrec, t);
      if (!pv || typeof pv.position === 'boolean') continue;
      const p = pv.position;
      // ECI (TEME) → current-frame ECEF via z-rotation by -GMST(now), km→m.
      const x = (cosG * p.x + sinG * p.y) * 1000;
      const y = (-sinG * p.x + cosG * p.y) * 1000;
      const z = p.z * 1000;
      positions.push(new Cesium.Cartesian3(x, y, z));

      if (orbitClass === 'UNKNOWN') {
        // Classify from an actual sample so trail color reflects reality.
        const altKm = Math.hypot(p.x, p.y, p.z) - 6378.137;
        orbitClass = classifyOrbit(altKm, (satrec.inclo * 180) / Math.PI, satrec.ecco);
        const c = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[orbitClass]);
        orbitHueRgb = [c.red, c.green, c.blue];
      }

      // Alpha fades linearly from 0 (oldest / tail) to 1 (newest / head).
      const alpha = 0.05 + 0.95 * (i / (SAMPLES - 1));
      const [r, g, b] = orbitHueRgb ?? [1, 1, 1];
      colors.push(new Cesium.Color(r, g, b, alpha));
    }
    if (positions.length < 2) return;

    // Rebuild the primitive from scratch — cheapest correct way to update
    // geometry + per-vertex colors in a Polyline.
    if (this.polyline) {
      this.scene.primitives.remove(this.polyline);
      this.polyline = null;
    }
    this.polyline = this.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 2.4,
            colors,
            colorsPerVertex: true,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
          }),
        }),
        appearance: new Cesium.PolylineColorAppearance({
          translucent: true,
        }),
        asynchronous: false,
      }),
    );
    this.lastBuildMs = performance.now();
  }
}
