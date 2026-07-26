import * as Cesium from "cesium";
import {
  ORBIT_CLASSES,
  ORBIT_CLASS_COLOR,
  type OrbitClass,
  type PropagationSnapshot,
} from "@spacemap/shared";

/**
 * Renders every satellite as a point primitive. Consumes the SoA snapshot
 * from the propagator worker (ECEF metres) directly — no per-satellite
 * object allocation. Filters by orbit class in-place.
 */
export class SatelliteLayer {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly index = new Map<number, Cesium.PointPrimitive>();
  private readonly colorByClass: Cesium.Color[];
  private readonly scratch = new Cesium.Cartesian3();

  constructor(scene: Cesium.Scene) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.colorByClass = ORBIT_CLASSES.map((cls: OrbitClass) => {
      const c = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[cls]);
      c.alpha = 0.95;
      return c;
    });
  }

  update(snap: PropagationSnapshot, filter: Set<OrbitClass>, highlightId: number | null): void {
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
      let p = this.index.get(id);
      if (!p) {
        p = this.points.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          color,
          pixelSize: isSelected ? 9 : 2.5,
          outlineWidth: isSelected ? 1.5 : 0,
          outlineColor: Cesium.Color.WHITE,
          id,
        });
        this.index.set(id, p);
      } else {
        // CRUCIAL: assigning the scratch reference triggers Cesium's setter,
        // which compares by value and clones into its own internal buffer,
        // marking the primitive dirty so the GPU picks up the new position.
        // Mutating p.position in place (e.g. Cartesian3.clone(scratch, p.position))
        // silently skips the dirty flag and freezes the point on screen.
        p.position = this.scratch;
        if (p.color !== color) p.color = color;
        const wantSize = isSelected ? 9 : 2.5;
        if (p.pixelSize !== wantSize) p.pixelSize = wantSize;
        const wantOutline = isSelected ? 1.5 : 0;
        if (p.outlineWidth !== wantOutline) p.outlineWidth = wantOutline;
      }
    }

    // Remove points that dropped out (filter change or catalog reduction).
    for (const [id, p] of this.index) {
      if (!seen.has(id)) {
        this.points.remove(p);
        this.index.delete(id);
      }
    }
  }

  /** Latest ECEF position of a satellite in the current frame, if visible. */
  positionOf(noradId: number): Cesium.Cartesian3 | null {
    const p = this.index.get(noradId);
    return p ? p.position : null;
  }

  clear(): void {
    this.points.removeAll();
    this.index.clear();
  }
}
