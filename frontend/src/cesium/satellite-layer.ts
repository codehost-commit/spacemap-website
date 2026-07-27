import * as Cesium from "cesium";
import {
  ORBIT_CLASSES,
  ORBIT_CLASS_COLOR,
  type OrbitClass,
  type PropagationSnapshot,
} from "@spacemap/shared";
import { buildSatelliteIcon } from "./satellite-icon.js";

/**
 * Renders satellites at two levels of detail:
 *   • PointPrimitive — cheap glowing dot, visible when far.
 *   • Billboard      — canvas-drawn satellite silhouette, fades in as the
 *                       camera approaches.
 *
 * Both live at exactly the same ECEF position and share the same `id` (NORAD),
 * so picking hits either one and returns the right satellite. `translucencyByDistance`
 * cross-fades them cleanly around the LOD threshold.
 */

// LOD cross-fade thresholds in metres (camera-to-primitive distance).
// Billboards start bleeding in at 25 000 km (mid-zoom) so they're visible
// well before you get "close", and completely take over inside 3 000 km.
const CLOSE_M = 3_000_000;   // fully billboards
const FAR_M = 25_000_000;    // fully points

const POINT_FADE = new Cesium.NearFarScalar(CLOSE_M, 0, FAR_M, 1);
const BILLBOARD_FADE = new Cesium.NearFarScalar(CLOSE_M, 1, FAR_M, 0);
// Grow the billboard as the camera gets closer — mimics perspective. Below
// 400 km distance we clamp so it doesn't fill the screen.
const BILLBOARD_SCALE = new Cesium.NearFarScalar(400_000, 1.6, 20_000_000, 0.55);

export class SatelliteLayer {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly billboards: Cesium.BillboardCollection;
  private readonly pointIndex = new Map<number, Cesium.PointPrimitive>();
  private readonly billboardIndex = new Map<number, Cesium.Billboard>();
  private readonly colorByClass: Cesium.Color[];
  private readonly iconUrl: string;
  private readonly scratch = new Cesium.Cartesian3();

  constructor(scene: Cesium.Scene) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.billboards = scene.primitives.add(new Cesium.BillboardCollection({ scene }));
    this.iconUrl = buildSatelliteIcon(64);
    this.colorByClass = ORBIT_CLASSES.map((cls: OrbitClass) => {
      const c = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[cls]);
      c.alpha = 0.95;
      return c;
    });
  }

  update(
    snap: PropagationSnapshot,
    filter: Set<OrbitClass>,
    highlightId: number | null,
  ): void {
    const filterMask = new Uint8Array(ORBIT_CLASSES.length);
    for (let i = 0; i < ORBIT_CLASSES.length; i++) {
      filterMask[i] = filter.has(ORBIT_CLASSES[i]) ? 1 : 0;
    }

    const seen = new Set<number>();
    const { count, ids, ecefPos, orbitClass } = snap;

    for (let n = 0; n < count; n++) {
      const cls = orbitClass[n];
      if (!filterMask[cls]) continue;
      const id = ids[n];
      seen.add(id);
      this.scratch.x = ecefPos[n * 3];
      this.scratch.y = ecefPos[n * 3 + 1];
      this.scratch.z = ecefPos[n * 3 + 2];
      const isSelected = highlightId === id;
      const color = this.colorByClass[cls];

      // --- Point (far LOD) ---
      let p = this.pointIndex.get(id);
      if (!p) {
        p = this.points.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          color,
          pixelSize: isSelected ? 9 : 3,
          outlineWidth: isSelected ? 1.5 : 0,
          outlineColor: Cesium.Color.WHITE,
          translucencyByDistance: POINT_FADE,
          id,
        });
        this.pointIndex.set(id, p);
      } else {
        p.position = this.scratch;
        if (p.color !== color) p.color = color;
        const wantSize = isSelected ? 9 : 3;
        if (p.pixelSize !== wantSize) p.pixelSize = wantSize;
        const wantOutline = isSelected ? 1.5 : 0;
        if (p.outlineWidth !== wantOutline) p.outlineWidth = wantOutline;
      }

      // --- Billboard (close LOD) ---
      let b = this.billboardIndex.get(id);
      if (!b) {
        b = this.billboards.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          image: this.iconUrl,
          color,
          scale: 0.5,
          scaleByDistance: BILLBOARD_SCALE,
          translucencyByDistance: BILLBOARD_FADE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          id,
        });
        this.billboardIndex.set(id, b);
      } else {
        b.position = this.scratch;
        if (b.color !== color) b.color = color;
        b.scale = isSelected ? 0.85 : 0.5;
      }
    }

    // Reap primitives that dropped out of the current filter / catalog.
    for (const [id, p] of this.pointIndex) {
      if (!seen.has(id)) {
        this.points.remove(p);
        this.pointIndex.delete(id);
      }
    }
    for (const [id, b] of this.billboardIndex) {
      if (!seen.has(id)) {
        this.billboards.remove(b);
        this.billboardIndex.delete(id);
      }
    }
  }

  positionOf(noradId: number): Cesium.Cartesian3 | null {
    const p = this.pointIndex.get(noradId);
    return p ? p.position : null;
  }

  clear(): void {
    this.points.removeAll();
    this.billboards.removeAll();
    this.pointIndex.clear();
    this.billboardIndex.clear();
  }
}
