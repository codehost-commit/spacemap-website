import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { ORBIT_CLASS_COLOR, classifyOrbit, type OrbitClass, type Tle } from "@spacemap/shared";

/**
 * Draws a single glowing orbit trail for the currently selected satellite.
 * The trail spans ±0.5 orbital periods from "now" so the user sees where the
 * satellite came from and where it's going next.
 */
export class OrbitTrail {
  private polyline: Cesium.Primitive | null = null;

  constructor(private readonly scene: Cesium.Scene) {}

  setFromTle(tle: Tle | null, now: Date): void {
    this.clear();
    if (!tle) return;

    let satrec: satellite.SatRec;
    try {
      satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    } catch {
      return;
    }
    if (satrec.error) return;

    // Mean motion is rev/day; period in minutes = 1440 / mean_motion.
    const meanMotionRevPerDay = (satrec.no * 60 * 24) / (2 * Math.PI);
    if (!Number.isFinite(meanMotionRevPerDay) || meanMotionRevPerDay <= 0) return;
    const periodMin = 1440 / meanMotionRevPerDay;
    const halfSpanMs = Math.min(periodMin, 720) * 30_000; // half period, capped at 6h.
    const steps = 240;
    const dtMs = (2 * halfSpanMs) / steps;
    const startMs = now.getTime() - halfSpanMs;

    const positions: Cesium.Cartesian3[] = [];
    let orbitClass: OrbitClass = "UNKNOWN";
    for (let i = 0; i <= steps; i++) {
      const d = new Date(startMs + i * dtMs);
      const pv = satellite.propagate(satrec, d);
      if (!pv || typeof pv.position === "boolean") continue;
      const gmst = satellite.gstime(d);
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      const altKm = geo.height;
      if (!Number.isFinite(altKm)) continue;
      if (orbitClass === "UNKNOWN") {
        orbitClass = classifyOrbit(altKm, (satrec.inclo * 180) / Math.PI, satrec.ecco);
      }
      positions.push(
        Cesium.Cartesian3.fromRadians(geo.longitude, geo.latitude, altKm * 1000),
      );
    }
    if (positions.length < 2) return;

    const color = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[orbitClass]);
    color.alpha = 0.85;

    this.polyline = this.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 1.6,
            vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
          }),
        }),
        appearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType("PolylineGlow", {
            glowPower: 0.25,
            taperPower: 0.6,
            color,
          }),
        }),
        asynchronous: false,
      }),
    );
  }

  clear(): void {
    if (this.polyline) {
      this.scene.primitives.remove(this.polyline);
      this.polyline = null;
    }
  }
}
