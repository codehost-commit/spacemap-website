import * as Cesium from "cesium";

/**
 * Named-brightest-star overlay. ~60 stars visible to the naked eye,
 * positioned in ICRF (celestial coordinates) and rotated to Earth-fixed each
 * frame via GMST. Rendered on top of the Cesium skybox with point size
 * mapped to apparent magnitude — brighter stars are bigger.
 *
 * Data: J2000 right ascension + declination + apparent magnitude for real
 * stars (Sirius, Vega, Betelgeuse, etc.). We use a low-precision GMST-only
 * rotation, which drifts by fractions of a degree over decades — plenty
 * accurate for visual identification.
 */
const STAR_RADIUS_M = 1e9; // placed at "very far" so parallax with Earth is nil

interface Star {
  name: string;
  raH: number; // right ascension in hours
  decDeg: number;
  mag: number;
  // Rough colour derived from spectral class (B–V mapped to warm/cool tint).
  rgb: [number, number, number];
}

// Top 60 apparent-magnitude stars visible to the naked eye. RA/Dec are J2000.
const STARS: Star[] = [
  { name: "Sirius", raH: 6.7525, decDeg: -16.7161, mag: -1.46, rgb: [1.0, 1.0, 1.0] },
  { name: "Canopus", raH: 6.3992, decDeg: -52.6957, mag: -0.72, rgb: [1.0, 0.98, 0.9] },
  { name: "Arcturus", raH: 14.2612, decDeg: 19.1824, mag: -0.05, rgb: [1.0, 0.85, 0.6] },
  { name: "Rigil Kentaurus", raH: 14.6599, decDeg: -60.8354, mag: -0.01, rgb: [1.0, 0.95, 0.85] },
  { name: "Vega", raH: 18.6156, decDeg: 38.7837, mag: 0.03, rgb: [0.85, 0.9, 1.0] },
  { name: "Capella", raH: 5.2782, decDeg: 45.998, mag: 0.08, rgb: [1.0, 0.95, 0.75] },
  { name: "Rigel", raH: 5.2423, decDeg: -8.2016, mag: 0.13, rgb: [0.7, 0.8, 1.0] },
  { name: "Procyon", raH: 7.6551, decDeg: 5.225, mag: 0.34, rgb: [1.0, 1.0, 0.95] },
  { name: "Achernar", raH: 1.6286, decDeg: -57.2367, mag: 0.46, rgb: [0.6, 0.75, 1.0] },
  { name: "Betelgeuse", raH: 5.9195, decDeg: 7.407, mag: 0.42, rgb: [1.0, 0.6, 0.4] },
  { name: "Hadar", raH: 14.0637, decDeg: -60.373, mag: 0.61, rgb: [0.7, 0.8, 1.0] },
  { name: "Altair", raH: 19.8464, decDeg: 8.8683, mag: 0.77, rgb: [1.0, 0.98, 0.95] },
  { name: "Acrux", raH: 12.4433, decDeg: -63.099, mag: 0.77, rgb: [0.7, 0.8, 1.0] },
  { name: "Aldebaran", raH: 4.5987, decDeg: 16.5093, mag: 0.85, rgb: [1.0, 0.7, 0.5] },
  { name: "Antares", raH: 16.4901, decDeg: -26.4319, mag: 1.09, rgb: [1.0, 0.55, 0.4] },
  { name: "Spica", raH: 13.4199, decDeg: -11.1614, mag: 1.04, rgb: [0.65, 0.75, 1.0] },
  { name: "Pollux", raH: 7.7553, decDeg: 28.0262, mag: 1.14, rgb: [1.0, 0.85, 0.6] },
  { name: "Fomalhaut", raH: 22.9608, decDeg: -29.622, mag: 1.16, rgb: [1.0, 0.98, 0.95] },
  { name: "Deneb", raH: 20.6906, decDeg: 45.2803, mag: 1.25, rgb: [0.9, 0.95, 1.0] },
  { name: "Mimosa", raH: 12.7953, decDeg: -59.6888, mag: 1.25, rgb: [0.75, 0.85, 1.0] },
  { name: "Regulus", raH: 10.1395, decDeg: 11.9672, mag: 1.4, rgb: [0.9, 0.95, 1.0] },
  { name: "Adhara", raH: 6.9771, decDeg: -28.9721, mag: 1.5, rgb: [0.75, 0.85, 1.0] },
  { name: "Shaula", raH: 17.5601, decDeg: -37.1038, mag: 1.62, rgb: [0.7, 0.8, 1.0] },
  { name: "Castor", raH: 7.5766, decDeg: 31.8883, mag: 1.58, rgb: [0.95, 0.98, 1.0] },
  { name: "Gacrux", raH: 12.5194, decDeg: -57.1132, mag: 1.63, rgb: [1.0, 0.6, 0.45] },
  { name: "Bellatrix", raH: 5.4188, decDeg: 6.3497, mag: 1.64, rgb: [0.75, 0.85, 1.0] },
  { name: "Elnath", raH: 5.4382, decDeg: 28.6082, mag: 1.65, rgb: [0.8, 0.9, 1.0] },
  { name: "Miaplacidus", raH: 9.22, decDeg: -69.7172, mag: 1.68, rgb: [1.0, 0.98, 0.9] },
  { name: "Alnilam", raH: 5.6036, decDeg: -1.2019, mag: 1.69, rgb: [0.7, 0.8, 1.0] },
  { name: "Alnair", raH: 22.1372, decDeg: -46.9609, mag: 1.74, rgb: [0.75, 0.85, 1.0] },
  { name: "Alnitak", raH: 5.6793, decDeg: -1.9426, mag: 1.77, rgb: [0.7, 0.8, 1.0] },
  { name: "Alioth", raH: 12.9004, decDeg: 55.9598, mag: 1.77, rgb: [0.95, 0.98, 1.0] },
  { name: "Dubhe", raH: 11.0621, decDeg: 61.7511, mag: 1.79, rgb: [1.0, 0.85, 0.6] },
  { name: "Mirfak", raH: 3.4054, decDeg: 49.8612, mag: 1.79, rgb: [1.0, 0.95, 0.8] },
  { name: "Wezen", raH: 7.1399, decDeg: -26.3932, mag: 1.83, rgb: [1.0, 0.95, 0.75] },
  { name: "Kaus Australis", raH: 18.4029, decDeg: -34.3846, mag: 1.85, rgb: [0.8, 0.9, 1.0] },
  { name: "Avior", raH: 8.375, decDeg: -59.5097, mag: 1.86, rgb: [1.0, 0.75, 0.55] },
  { name: "Alkaid", raH: 13.7923, decDeg: 49.3133, mag: 1.86, rgb: [0.7, 0.8, 1.0] },
  { name: "Sargas", raH: 17.6221, decDeg: -42.9978, mag: 1.87, rgb: [1.0, 0.95, 0.85] },
  { name: "Menkalinan", raH: 5.9921, decDeg: 44.9475, mag: 1.9, rgb: [0.95, 0.98, 1.0] },
  { name: "Atria", raH: 16.8111, decDeg: -69.0277, mag: 1.91, rgb: [1.0, 0.75, 0.55] },
  { name: "Alhena", raH: 6.6285, decDeg: 16.3993, mag: 1.93, rgb: [0.9, 0.95, 1.0] },
  { name: "Peacock", raH: 20.4275, decDeg: -56.735, mag: 1.94, rgb: [0.75, 0.85, 1.0] },
  { name: "Polaris", raH: 2.5301, decDeg: 89.2641, mag: 1.98, rgb: [1.0, 0.95, 0.85] },
  { name: "Mirzam", raH: 6.3783, decDeg: -17.9559, mag: 1.98, rgb: [0.7, 0.8, 1.0] },
  { name: "Alphard", raH: 9.4595, decDeg: -8.6586, mag: 1.98, rgb: [1.0, 0.85, 0.6] },
  { name: "Hamal", raH: 2.1195, decDeg: 23.4624, mag: 2.0, rgb: [1.0, 0.8, 0.55] },
  { name: "Algieba", raH: 10.3329, decDeg: 19.8415, mag: 2.08, rgb: [1.0, 0.8, 0.55] },
  { name: "Diphda", raH: 0.7264, decDeg: -17.9866, mag: 2.04, rgb: [1.0, 0.85, 0.6] },
  { name: "Nunki", raH: 18.9211, decDeg: -26.2967, mag: 2.05, rgb: [0.7, 0.8, 1.0] },
  { name: "Menkent", raH: 14.1114, decDeg: -36.3701, mag: 2.06, rgb: [1.0, 0.85, 0.6] },
  { name: "Mirach", raH: 1.1622, decDeg: 35.6206, mag: 2.05, rgb: [1.0, 0.75, 0.55] },
  { name: "Alpheratz", raH: 0.1398, decDeg: 29.0904, mag: 2.06, rgb: [0.9, 0.95, 1.0] },
  { name: "Kochab", raH: 14.8451, decDeg: 74.1555, mag: 2.08, rgb: [1.0, 0.85, 0.6] },
  { name: "Saiph", raH: 5.7959, decDeg: -9.6696, mag: 2.09, rgb: [0.75, 0.85, 1.0] },
  { name: "Denebola", raH: 11.8177, decDeg: 14.5721, mag: 2.14, rgb: [1.0, 1.0, 0.95] },
  { name: "Algol", raH: 3.1361, decDeg: 40.9556, mag: 2.09, rgb: [0.9, 0.95, 1.0] },
  { name: "Tiaki", raH: 22.7113, decDeg: -46.8846, mag: 2.07, rgb: [1.0, 0.6, 0.45] },
  { name: "Muhlifain", raH: 12.6919, decDeg: -48.9598, mag: 2.2, rgb: [1.0, 0.98, 0.95] },
  { name: "Aspidiske", raH: 9.285, decDeg: -59.2755, mag: 2.21, rgb: [1.0, 0.98, 0.9] },
  { name: "Suhail", raH: 9.1332, decDeg: -43.4326, mag: 2.23, rgb: [1.0, 0.75, 0.55] },
  { name: "Rasalhague", raH: 17.5822, decDeg: 12.5601, mag: 2.08, rgb: [0.95, 0.98, 1.0] },
];

export class StarCatalog {
  private collection: Cesium.PointPrimitiveCollection | null = null;
  private tickDispose: (() => void) | null = null;
  private readonly scene: Cesium.Scene;

  constructor(private readonly viewer: Cesium.Viewer) {
    const scene = viewer.scene;
    this.scene = scene;
    const col = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.collection = col;

    for (const s of STARS) {
      const ra = (s.raH * 15 * Math.PI) / 180;
      const dec = (s.decDeg * Math.PI) / 180;
      const cosDec = Math.cos(dec);
      // ECI unit vector, scaled to a very large radius.
      const x = STAR_RADIUS_M * cosDec * Math.cos(ra);
      const y = STAR_RADIUS_M * cosDec * Math.sin(ra);
      const z = STAR_RADIUS_M * Math.sin(dec);
      // Point size mapped from magnitude — 5 px at mag 2, up to 14 px at mag -1.5.
      const size = Math.max(2.5, 10 - s.mag * 2.4);
      col.add({
        position: new Cesium.Cartesian3(x, y, z),
        color: new Cesium.Color(s.rgb[0], s.rgb[1], s.rgb[2], 1),
        pixelSize: size,
        outlineWidth: 0,
        // Never occluded by Earth — they're outside the scene anyway, but this
        // avoids depth issues at the far frustum.
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }

    // Rotate the whole collection each frame from ECI → current ECEF.
    this.tickDispose = scene.preRender.addEventListener(() => {
      const date = Cesium.JulianDate.toDate(viewer.clock.currentTime);
      const gmst = greenwichSiderealTime(
        date.getTime() / 86_400_000 + 2440587.5,
      );
      // Rotation about Z by -GMST maps ECI → ECEF.
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
        /* viewer torn down */
      }
      this.collection = null;
    }
  }
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
