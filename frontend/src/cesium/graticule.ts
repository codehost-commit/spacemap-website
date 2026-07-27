import * as Cesium from "cesium";

/**
 * Togglable lat/lon graticule — 30° meridians + parallels drawn on a shell
 * just above Earth's surface. Built once when enabled, torn down on disable.
 * Meridians drawn every 30°, parallels every 30° (skipping ±90° which would
 * be a single point).
 */
const SHELL_M = 6_378_137 + 500; // metres
const MERIDIAN_STEP_DEG = 30;
const PARALLEL_STEP_DEG = 30;
const ARC_SAMPLES = 91;

export class Graticule {
  private collection: Cesium.PolylineCollection | null = null;
  private enabled = false;

  constructor(private readonly scene: Cesium.Scene) {}

  setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    if (v) this.build();
    else this.clear();
  }

  destroy(): void {
    this.clear();
  }

  private build(): void {
    const col = this.scene.primitives.add(new Cesium.PolylineCollection());
    this.collection = col;

    const equatorMaterial = Cesium.Material.fromType("Color", {
      color: new Cesium.Color(0.4, 0.85, 1, 0.55),
    });
    const primeMeridianMaterial = Cesium.Material.fromType("Color", {
      color: new Cesium.Color(0.4, 0.85, 1, 0.55),
    });
    const majorMaterial = Cesium.Material.fromType("Color", {
      color: new Cesium.Color(0.55, 0.65, 0.8, 0.28),
    });

    // Meridians (constant longitude, lat from -90 to +90).
    for (let lonDeg = -180; lonDeg < 180; lonDeg += MERIDIAN_STEP_DEG) {
      const positions: Cesium.Cartesian3[] = new Array(ARC_SAMPLES);
      for (let i = 0; i < ARC_SAMPLES; i++) {
        const lat = -90 + (180 * i) / (ARC_SAMPLES - 1);
        positions[i] = Cesium.Cartesian3.fromDegrees(lonDeg, lat, SHELL_M - 6_378_137);
      }
      col.add({
        positions,
        width: lonDeg === 0 ? 1.4 : 0.8,
        material: lonDeg === 0 ? primeMeridianMaterial : majorMaterial,
      });
    }

    // Parallels (constant latitude, lon from -180 to +180).
    for (let latDeg = -60; latDeg <= 60; latDeg += PARALLEL_STEP_DEG) {
      const positions: Cesium.Cartesian3[] = new Array(ARC_SAMPLES);
      for (let i = 0; i < ARC_SAMPLES; i++) {
        const lon = -180 + (360 * i) / (ARC_SAMPLES - 1);
        positions[i] = Cesium.Cartesian3.fromDegrees(lon, latDeg, SHELL_M - 6_378_137);
      }
      col.add({
        positions,
        width: latDeg === 0 ? 1.4 : 0.8,
        material: latDeg === 0 ? equatorMaterial : majorMaterial,
      });
    }
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
  }
}
