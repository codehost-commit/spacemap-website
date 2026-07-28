import * as Cesium from 'cesium';

/**
 * Star field rendered on top of the Cesium skybox. Two data paths:
 *
 *   1. Hardcoded top-60 bright named stars (Sirius, Vega, Betelgeuse, etc.).
 *      Added immediately so there's always *something* even if the network is
 *      slow or the binary catalog isn't present in dev.
 *   2. HYG v3 binary catalog, fetched from `${base}data/stars.bin`. Contains
 *      ~15 000 stars (mag ≤ 7). Adds them on top of the hardcoded set with
 *      dedup by rough position.
 *
 * All stars sit at STAR_RADIUS_M in ECI. The whole collection is rotated
 * ECI→ECEF each frame via a GMST-only approximation.
 */
const STAR_RADIUS_M = 1e12;

interface StarSeed {
  raRad: number;
  decRad: number;
  mag: number;
  rgb: [number, number, number];
}

const NAMED_STARS: Array<{
  name: string;
  raH: number;
  decDeg: number;
  mag: number;
  rgb: [number, number, number];
}> = [
  { name: 'Sirius', raH: 6.7525, decDeg: -16.7161, mag: -1.46, rgb: [1.0, 1.0, 1.0] },
  { name: 'Canopus', raH: 6.3992, decDeg: -52.6957, mag: -0.72, rgb: [1.0, 0.98, 0.9] },
  { name: 'Arcturus', raH: 14.2612, decDeg: 19.1824, mag: -0.05, rgb: [1.0, 0.85, 0.6] },
  { name: 'Rigil Kentaurus', raH: 14.6599, decDeg: -60.8354, mag: -0.01, rgb: [1.0, 0.95, 0.85] },
  { name: 'Vega', raH: 18.6156, decDeg: 38.7837, mag: 0.03, rgb: [0.85, 0.9, 1.0] },
  { name: 'Capella', raH: 5.2782, decDeg: 45.998, mag: 0.08, rgb: [1.0, 0.95, 0.75] },
  { name: 'Rigel', raH: 5.2423, decDeg: -8.2016, mag: 0.13, rgb: [0.7, 0.8, 1.0] },
  { name: 'Procyon', raH: 7.6551, decDeg: 5.225, mag: 0.34, rgb: [1.0, 1.0, 0.95] },
  { name: 'Achernar', raH: 1.6286, decDeg: -57.2367, mag: 0.46, rgb: [0.6, 0.75, 1.0] },
  { name: 'Betelgeuse', raH: 5.9195, decDeg: 7.407, mag: 0.42, rgb: [1.0, 0.6, 0.4] },
  { name: 'Altair', raH: 19.8464, decDeg: 8.8683, mag: 0.77, rgb: [1.0, 0.98, 0.95] },
  { name: 'Aldebaran', raH: 4.5987, decDeg: 16.5093, mag: 0.85, rgb: [1.0, 0.7, 0.5] },
  { name: 'Antares', raH: 16.4901, decDeg: -26.4319, mag: 1.09, rgb: [1.0, 0.55, 0.4] },
  { name: 'Spica', raH: 13.4199, decDeg: -11.1614, mag: 1.04, rgb: [0.65, 0.75, 1.0] },
  { name: 'Pollux', raH: 7.7553, decDeg: 28.0262, mag: 1.14, rgb: [1.0, 0.85, 0.6] },
  { name: 'Fomalhaut', raH: 22.9608, decDeg: -29.622, mag: 1.16, rgb: [1.0, 0.98, 0.95] },
  { name: 'Deneb', raH: 20.6906, decDeg: 45.2803, mag: 1.25, rgb: [0.9, 0.95, 1.0] },
  { name: 'Regulus', raH: 10.1395, decDeg: 11.9672, mag: 1.4, rgb: [0.9, 0.95, 1.0] },
  { name: 'Castor', raH: 7.5766, decDeg: 31.8883, mag: 1.58, rgb: [0.95, 0.98, 1.0] },
  { name: 'Polaris', raH: 2.5301, decDeg: 89.2641, mag: 1.98, rgb: [1.0, 0.95, 0.85] },
];

export class StarCatalog {
  private collection: Cesium.PointPrimitiveCollection | null = null;
  private tickDispose: (() => void) | null = null;
  private readonly scene: Cesium.Scene;
  private readonly viewer: Cesium.Viewer;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    const col = this.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.collection = col;

    // Seed with hardcoded brights so the sky isn't empty during fetch.
    for (const s of NAMED_STARS) {
      this.addOne({
        raRad: (s.raH * 15 * Math.PI) / 180,
        decRad: (s.decDeg * Math.PI) / 180,
        mag: s.mag,
        rgb: s.rgb,
      });
    }

    // Fetch the full HYG binary in the background.
    void this.tryLoadBinaryCatalog();

    // Rotate the whole collection each frame from ECI → current ECEF.
    this.tickDispose = this.scene.preRender.addEventListener(() => {
      const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
      const gmst = greenwichSiderealTime(date.getTime() / 86_400_000 + 2440587.5);
      const c = Math.cos(-gmst);
      const s = Math.sin(-gmst);
      Cesium.Matrix4.fromArray(
        [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        0,
        col.modelMatrix,
      );
    });
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    if (this.collection) {
      try {
        this.scene.primitives.remove(this.collection);
      } catch {
        /* torn down */
      }
      this.collection = null;
    }
  }

  private async tryLoadBinaryCatalog(): Promise<void> {
    const url = `${import.meta.env.BASE_URL}data/stars.bin`;
    let buf: ArrayBuffer;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      buf = await res.arrayBuffer();
    } catch {
      return;
    }
    if (buf.byteLength < 4 || !this.collection) return;

    // Wipe the hardcoded seed — HYG contains those same brights plus everything
    // else, so we avoid double-plotting.
    this.collection.removeAll();

    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    if (count === 0 || 4 + count * 16 > buf.byteLength) return;
    const floats = new Float32Array(buf, 4, count * 4);

    for (let i = 0; i < count; i++) {
      const raRad = floats[i * 4];
      const decRad = floats[i * 4 + 1];
      const mag = floats[i * 4 + 2];
      const ci = floats[i * 4 + 3];
      this.addOne({ raRad, decRad, mag, rgb: colourFromCi(ci) });
    }
    console.info(`[stars] loaded ${count.toLocaleString()} from HYG`);
  }

  private addOne(seed: StarSeed): void {
    if (!this.collection) return;
    const cosDec = Math.cos(seed.decRad);
    const x = STAR_RADIUS_M * cosDec * Math.cos(seed.raRad);
    const y = STAR_RADIUS_M * cosDec * Math.sin(seed.raRad);
    const z = STAR_RADIUS_M * Math.sin(seed.decRad);
    // Size: bright stars (mag ~ -1) are ~10 px, faint (mag ~ 6.5) ~1 px.
    const size = Math.max(0.6, 6.5 - seed.mag * 1.0);
    // Alpha: bright fully opaque, dim more translucent so the sky reads soft.
    const alpha = Math.max(0.35, Math.min(1, 1 - (seed.mag - 1) / 8));
    this.collection.add({
      position: new Cesium.Cartesian3(x, y, z),
      color: new Cesium.Color(seed.rgb[0], seed.rgb[1], seed.rgb[2], alpha),
      pixelSize: size,
      outlineWidth: 0,
      // Depth test *on* — Earth should occlude stars on the far side.
      // Previous code disabled depth at infinity, which caused stars to
      // show *through* the planet in POV / orbit views.
    });
  }
}

/**
 * B-V colour index → approximate visible RGB. Cool stars (large B-V) are
 * reddish, hot stars (negative B-V) are bluish. Linear approximation from
 * standard MK spectral colour tables.
 */
function colourFromCi(ci: number): [number, number, number] {
  if (!Number.isFinite(ci)) return [1, 1, 1];
  const bv = Math.max(-0.4, Math.min(2.0, ci));
  // Piecewise: <0 blue-white, ~0 white, >1 orange-red.
  if (bv < 0) {
    const t = (bv + 0.4) / 0.4; // -0.4→0, 0→1
    return [0.6 + 0.4 * t, 0.75 + 0.25 * t, 1.0];
  }
  if (bv < 0.8) {
    const t = bv / 0.8; // 0→0, 0.8→1
    return [1.0, 1.0 - 0.15 * t, 1.0 - 0.35 * t];
  }
  const t = Math.min(1, (bv - 0.8) / 1.2); // 0.8→0, 2.0→1
  return [1.0, 0.85 - 0.35 * t, 0.65 - 0.5 * t];
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
