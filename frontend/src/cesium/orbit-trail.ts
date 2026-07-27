import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { ORBIT_CLASS_COLOR, classifyOrbit, type OrbitClass, type Tle } from "@spacemap/shared";

/**
 * Draws a single glowing orbit trail for the currently selected satellite.
 * The trail spans ±0.5 orbital periods from "now" so the user sees where the
 * satellite came from and where it's going next.
 */
export class OrbitTrail {
  private glow: Cesium.Primitive | null = null;
  private ribbon: Cesium.Primitive | null = null;

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
    color.alpha = 0.92;

    this.glow = this.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 2.8,
            vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
          }),
        }),
        appearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType("PolylineGlow", {
            glowPower: 0.22,
            taperPower: 0.3,
            color: color.withAlpha(0.42),
          }),
        }),
        asynchronous: false,
      }),
    );
    this.ribbon = buildGradientRibbon(this.scene, positions, color);
  }

  clear(): void {
    if (this.glow) this.scene.primitives.remove(this.glow);
    if (this.ribbon) this.scene.primitives.remove(this.ribbon);
    this.glow = null;
    this.ribbon = null;
  }
}

function buildGradientRibbon(
  scene: Cesium.Scene,
  positions: Cesium.Cartesian3[],
  color: Cesium.Color,
): Cesium.Primitive {
  const instances: Cesium.GeometryInstance[] = [];
  const last = positions.length - 1;
  for (let i = 0; i < last; i++) {
    const startT = i / last;
    const endT = (i + 1) / last;
    const startColor = fadeColor(color, startT);
    const endColor = fadeColor(color, endT);
    instances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [positions[i], positions[i + 1]],
          width: 1.9,
          colors: [startColor, endColor],
          colorsPerVertex: true,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        }),
      }),
    );
  }

  return scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: instances,
      appearance: new Cesium.PolylineColorAppearance(),
      asynchronous: false,
    }),
  );
}

function fadeColor(base: Cesium.Color, t: number): Cesium.Color {
  const alpha = Math.pow(t, 1.45) * 0.95;
  const intensity = 0.45 + 0.55 * t;
  return new Cesium.Color(
    Cesium.Math.lerp(0.08, base.red, intensity),
    Cesium.Math.lerp(0.14, base.green, intensity),
    Cesium.Math.lerp(0.2, base.blue, intensity),
    alpha,
  );
}
