import * as Cesium from "cesium";
import { CITIES } from "../data/cities.js";

/**
 * City labels overlay. Renders a dot + label per city, gated by camera
 * distance per tier so the world doesn't turn into a wall of text at wide
 * zoom.
 *
 *   Tier 1 (mega-cities) — always visible
 *   Tier 2 (large cities) — visible < 25 000 km camera height
 *   Tier 3 (notable / capitals) — visible < 8 000 km camera height
 */
export class Cities {
  private labels: Cesium.LabelCollection | null = null;
  private points: Cesium.PointPrimitiveCollection | null = null;
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
    const scene = this.scene;
    const labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));
    const points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.labels = labels;
    this.points = points;

    for (const city of CITIES) {
      const maxDist =
        city.tier === 1
          ? Number.POSITIVE_INFINITY
          : city.tier === 2
            ? 25_000_000
            : 8_000_000;
      const condition = new Cesium.DistanceDisplayCondition(0, maxDist);
      const position = Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 0);

      points.add({
        position,
        pixelSize: city.tier === 1 ? 5 : 3,
        color: new Cesium.Color(1, 1, 1, 0.9),
        outlineColor: new Cesium.Color(0, 0, 0, 0.5),
        outlineWidth: 1,
        distanceDisplayCondition: condition,
      });
      labels.add({
        position,
        text: city.name,
        font: `${city.tier === 1 ? 12 : 11}px "JetBrains Mono", monospace`,
        fillColor: new Cesium.Color(1, 1, 1, 0.95),
        outlineColor: new Cesium.Color(0, 0, 0, 0.75),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(6, -2),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        // Shrink a bit at extreme zooms so labels don't dominate.
        scaleByDistance: new Cesium.NearFarScalar(
          500_000,
          1,
          25_000_000,
          city.tier === 1 ? 0.7 : 0.6,
        ),
        distanceDisplayCondition: condition,
        // Never occluded by satellites floating in front.
        eyeOffset: new Cesium.Cartesian3(0, 0, -1000),
      });
    }
  }

  private clear(): void {
    if (this.labels) {
      try {
        this.scene.primitives.remove(this.labels);
      } catch {
        /* torn down */
      }
      this.labels = null;
    }
    if (this.points) {
      try {
        this.scene.primitives.remove(this.points);
      } catch {
        /* torn down */
      }
      this.points = null;
    }
  }
}
