import * as Cesium from "cesium";

/**
 * Naked-eye planets rendered in the celestial frame. Positions come from a
 * self-contained Keplerian ephemeris — mean orbital elements at J2000 plus
 * linear rates, solved to arcminute precision over a century-ish window.
 * Good enough that constellations and inner planets line up visibly with
 * the real sky.
 *
 * Recomputed once a second; planets move slowly enough that faster is waste.
 * Rotates ECI → ECEF each frame via GMST, same as the star catalog.
 */
const PLANET_RADIUS_M = 9e11; // just inside the star shell so planets sit in front

interface OrbitalElements {
  N: [number, number]; // longitude of ascending node (deg, deg/day)
  i: [number, number]; // inclination (deg, deg/day)
  w: [number, number]; // argument of perihelion (deg, deg/day)
  a: [number, number]; // semi-major axis (AU, AU/day)
  e: [number, number]; // eccentricity (—, /day)
  M: [number, number]; // mean anomaly (deg, deg/day)
}

interface PlanetDef {
  name: string;
  rgb: [number, number, number];
  baseSize: number;
  elements: OrbitalElements;
}

// Elements from Paul Schlyter (stjarnhimlen.se/comp/ppcomp.html), epoch
// 1999-12-31 00:00 UTC (d = 0). We correct our own d for J2000 offset.
const EPOCH_JD = 2451543.5;

const EARTH: OrbitalElements = {
  N: [0.0, 0.0],
  i: [0.0, 0.0],
  w: [282.9404, 4.70935e-5],
  a: [1.0, 0.0],
  e: [0.016709, -1.151e-9],
  M: [356.047, 0.9856002585],
};
const PLANETS: PlanetDef[] = [
  {
    name: "Mercury",
    rgb: [0.85, 0.75, 0.6],
    baseSize: 4,
    elements: {
      N: [48.3313, 3.24587e-5],
      i: [7.0047, 5.0e-8],
      w: [29.1241, 1.01444e-5],
      a: [0.387098, 0],
      e: [0.205635, 5.59e-10],
      M: [168.6562, 4.0923344368],
    },
  },
  {
    name: "Venus",
    rgb: [1.0, 0.95, 0.8],
    baseSize: 6,
    elements: {
      N: [76.6799, 2.4659e-5],
      i: [3.3946, 2.75e-8],
      w: [54.891, 1.38374e-5],
      a: [0.72333, 0],
      e: [0.006773, -1.302e-9],
      M: [48.0052, 1.6021302244],
    },
  },
  {
    name: "Mars",
    rgb: [1.0, 0.55, 0.35],
    baseSize: 5,
    elements: {
      N: [49.5574, 2.11081e-5],
      i: [1.8497, -1.78e-8],
      w: [286.5016, 2.92961e-5],
      a: [1.523688, 0],
      e: [0.093405, 2.516e-9],
      M: [18.6021, 0.5240207766],
    },
  },
  {
    name: "Jupiter",
    rgb: [1.0, 0.85, 0.65],
    baseSize: 7,
    elements: {
      N: [100.4542, 2.76854e-5],
      i: [1.303, -1.557e-7],
      w: [273.8777, 1.6435e-5],
      a: [5.20256, 0],
      e: [0.048498, 4.469e-9],
      M: [19.895, 0.0830853001],
    },
  },
  {
    name: "Saturn",
    rgb: [1.0, 0.9, 0.7],
    baseSize: 6,
    elements: {
      N: [113.6634, 2.3898e-5],
      i: [2.4886, -1.081e-7],
      w: [339.3939, 2.97661e-5],
      a: [9.55475, 0],
      e: [0.055546, -9.499e-9],
      M: [316.967, 0.0334442282],
    },
  },
  {
    name: "Uranus",
    rgb: [0.75, 0.9, 0.95],
    baseSize: 4,
    elements: {
      N: [74.0005, 1.3978e-5],
      i: [0.7733, 1.9e-8],
      w: [96.6612, 3.0565e-5],
      a: [19.18171, -1.55e-8],
      e: [0.047318, 7.45e-9],
      M: [142.5905, 0.011725806],
    },
  },
  {
    name: "Neptune",
    rgb: [0.6, 0.75, 1.0],
    baseSize: 4,
    elements: {
      N: [131.7806, 3.0173e-5],
      i: [1.77, -2.55e-7],
      w: [272.8461, -6.027e-6],
      a: [30.05826, 3.313e-8],
      e: [0.008606, 2.15e-9],
      M: [260.2471, 0.005995147],
    },
  },
];

export class Planets {
  private collection: Cesium.PointPrimitiveCollection | null = null;
  private labels: Cesium.LabelCollection | null = null;
  private tickDispose: (() => void) | null = null;
  private updateDispose: (() => void) | null = null;
  private lastUpdateMs = 0;

  constructor(private readonly viewer: Cesium.Viewer) {
    const scene = viewer.scene;
    const col = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    const labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));
    this.collection = col;
    this.labels = labels;

    for (const p of PLANETS) {
      col.add({
        position: new Cesium.Cartesian3(PLANET_RADIUS_M, 0, 0), // reset each tick
        color: new Cesium.Color(p.rgb[0], p.rgb[1], p.rgb[2], 1),
        pixelSize: p.baseSize,
        outlineWidth: 0,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      labels.add({
        position: new Cesium.Cartesian3(PLANET_RADIUS_M, 0, 0),
        text: p.name,
        font: '10px "JetBrains Mono", monospace',
        fillColor: new Cesium.Color(p.rgb[0], p.rgb[1], p.rgb[2], 0.85),
        outlineColor: new Cesium.Color(0, 0, 0, 0.9),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(6, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        eyeOffset: new Cesium.Cartesian3(0, 0, -1_000_000),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
          0,
          2e11,
        ),
      });
    }

    // Rotate the whole collection into ECEF each frame from GMST.
    this.tickDispose = scene.preRender.addEventListener(() => {
      const date = Cesium.JulianDate.toDate(viewer.clock.currentTime);
      const jd = date.getTime() / 86_400_000 + 2440587.5;
      const gmst = greenwichSiderealTime(jd);
      const c = Math.cos(-gmst);
      const s = Math.sin(-gmst);
      const m = [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      Cesium.Matrix4.fromArray(m, 0, col.modelMatrix);
      Cesium.Matrix4.fromArray(m, 0, labels.modelMatrix);

      // Recompute planet positions once per second — they move at most ~4°/day.
      const now = performance.now();
      if (now - this.lastUpdateMs > 1000) {
        this.lastUpdateMs = now;
        this.updatePositions(jd);
      }
    });
    // Compute once immediately so planets aren't at the placeholder position.
    this.updatePositions(
      Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() / 86_400_000 +
        2440587.5,
    );
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    this.updateDispose?.();
    this.updateDispose = null;
    const scene = this.viewer.scene;
    if (this.collection) {
      try {
        scene.primitives.remove(this.collection);
      } catch {
        /* torn down */
      }
      this.collection = null;
    }
    if (this.labels) {
      try {
        scene.primitives.remove(this.labels);
      } catch {
        /* torn down */
      }
      this.labels = null;
    }
  }

  private updatePositions(jd: number): void {
    if (!this.collection || !this.labels) return;
    const d = jd - EPOCH_JD;
    const eclObliq = (23.4393 - 3.563e-7 * d) * DEG;

    const earthHelio = helioPosition(EARTH, d);
    for (let i = 0; i < PLANETS.length; i++) {
      const helio = helioPosition(PLANETS[i].elements, d);
      // Geocentric = planet - earth in ecliptic Cartesian.
      const xg = helio.x - earthHelio.x;
      const yg = helio.y - earthHelio.y;
      const zg = helio.z - earthHelio.z;
      // Ecliptic → equatorial (ECI).
      const cosE = Math.cos(eclObliq);
      const sinE = Math.sin(eclObliq);
      const xe = xg;
      const ye = yg * cosE - zg * sinE;
      const ze = yg * sinE + zg * cosE;
      const r = Math.hypot(xe, ye, ze);
      const ux = xe / r;
      const uy = ye / r;
      const uz = ze / r;
      const pos = new Cesium.Cartesian3(
        ux * PLANET_RADIUS_M,
        uy * PLANET_RADIUS_M,
        uz * PLANET_RADIUS_M,
      );
      this.collection.get(i).position = pos;
      this.labels.get(i).position = pos;
    }
  }
}

const DEG = Math.PI / 180;

function elt(e: [number, number], d: number): number {
  return e[0] + e[1] * d;
}

function helioPosition(el: OrbitalElements, d: number): {
  x: number;
  y: number;
  z: number;
} {
  const N = elt(el.N, d) * DEG;
  const i = elt(el.i, d) * DEG;
  const w = elt(el.w, d) * DEG;
  const a = elt(el.a, d);
  const e = elt(el.e, d);
  let M = ((elt(el.M, d) % 360) + 360) % 360;
  M *= DEG;

  // Solve Kepler's equation: E − e·sin E = M. Two Newton iterations gives
  // ~arcsecond precision for e < 0.2 (all our targets).
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 3; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);

  const cN = Math.cos(N);
  const sN = Math.sin(N);
  const cvw = Math.cos(v + w);
  const svw = Math.sin(v + w);
  const ci = Math.cos(i);
  const si = Math.sin(i);

  return {
    x: r * (cN * cvw - sN * svw * ci),
    y: r * (sN * cvw + cN * svw * ci),
    z: r * (svw * si),
  };
}

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
