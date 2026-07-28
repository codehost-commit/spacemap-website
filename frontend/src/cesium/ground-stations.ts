import * as Cesium from 'cesium';
import { GROUND_STATIONS, type StationType } from '../data/ground-stations.js';

/**
 * Ground infrastructure overlay — DSN dishes, launch pads, notable amateur
 * stations. Modelled on `cities.ts`: one primitive collection for the
 * markers, one label collection for the names, both distance-gated per
 * tier so the map doesn't turn into text soup at wide zoom.
 */
const TIER_MAX_DIST_M: Record<1 | 2 | 3, number> = {
  1: 22_000_000, // mega-important (DSN + top launch pads) — always visible
  2: 8_500_000,
  3: 3_000_000,
};

const TYPE_COLOR: Record<StationType, Cesium.Color> = {
  dsn: new Cesium.Color(1.0, 0.75, 0.35, 1.0), // amber for antennas
  launch: new Cesium.Color(1.0, 0.42, 0.42, 1.0), // red for pads
  tracking: new Cesium.Color(0.55, 0.85, 1.0, 1.0), // pale blue
};

const TYPE_ICON: Record<StationType, string> = {
  dsn: '◉',
  launch: '▲',
  tracking: '◆',
};

export class GroundStations {
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

    for (const st of GROUND_STATIONS) {
      const maxDist = TIER_MAX_DIST_M[st.tier];
      const condition = new Cesium.DistanceDisplayCondition(0, maxDist);
      const position = Cesium.Cartesian3.fromDegrees(st.lon, st.lat, 0);
      const color = TYPE_COLOR[st.type];

      points.add({
        position,
        pixelSize: st.tier === 1 ? 6 : 4,
        color,
        outlineColor: new Cesium.Color(0, 0, 0, 0.6),
        outlineWidth: 1.5,
        distanceDisplayCondition: condition,
      });
      labels.add({
        position,
        text: `${TYPE_ICON[st.type]} ${st.name}`,
        font: `${st.tier === 1 ? 11 : 10}px "JetBrains Mono", monospace`,
        fillColor: new Cesium.Color(
          Math.min(1, color.red + 0.15),
          Math.min(1, color.green + 0.15),
          Math.min(1, color.blue + 0.15),
          0.95,
        ),
        outlineColor: new Cesium.Color(0, 0, 0, 0.8),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(8, -3),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        scaleByDistance: new Cesium.NearFarScalar(
          500_000,
          1,
          20_000_000,
          st.tier === 1 ? 0.55 : 0.45,
        ),
        distanceDisplayCondition: condition,
        eyeOffset: new Cesium.Cartesian3(0, 0, -800),
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
