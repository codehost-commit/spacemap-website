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
 * ## Horizon culling
 *
 * The main-thread cost of a snapshot is dominated by the ~30 000 position
 * writes we do into two Cesium collections. Roughly half the catalog is
 * behind Earth from the camera's perspective at any moment, so we skip
 * writes for those slots. Two-horizon test used:
 *
 *   dot(C, S) > R² − √((|C|²−R²) × (|S|²−R²))
 *
 * where C is the camera in ECEF, S is the satellite in ECEF, and R is
 * Earth's radius. This is exactly the "the tangent cones from C and S
 * touching the sphere overlap" condition — no arccosines, no branches.
 *
 * ## Back-side freshness
 *
 * A satellite that stays occluded isn't updated, so if the user rotates the
 * globe suddenly, the far side would show stale positions from whenever they
 * last rotated away. To keep everyone reasonably fresh:
 *
 * Each snapshot we refresh a *rolling batch* of catalog slots regardless of
 * visibility. The batch size is chosen so we cover the full catalog within
 * TARGET_STALE_SIM_MS of sim time — the batch grows automatically when the
 * user time-warps at 100× or 1000× (since more sim time passes per wall
 * snapshot). Time discontinuities (Now / Jump…) are detected via a large
 * jump in snap.timeMs and trigger a one-shot full refresh so nothing is
 * left frozen at a wildly wrong position.
 */

// LOD cross-fade thresholds in metres (camera-to-primitive distance).
const CLOSE_M = 3_000_000;
const FAR_M = 25_000_000;

const POINT_FADE = new Cesium.NearFarScalar(CLOSE_M, 0, FAR_M, 1);
const BILLBOARD_FADE = new Cesium.NearFarScalar(CLOSE_M, 1, FAR_M, 0);
const BILLBOARD_SCALE = new Cesium.NearFarScalar(400_000, 1.6, 20_000_000, 0.55);

// Culling constants.
const EARTH_R_M = 6_378_137;
const EARTH_R_SQ = EARTH_R_M * EARTH_R_M;
// How stale a culled satellite is allowed to become (in sim time). Chosen so
// LEO satellites drift < ~40 km before their next update.
const TARGET_STALE_SIM_MS = 5_000;
// A sim-time jump larger than this triggers a one-shot full refresh — covers
// "Now" and "Jump…" clock changes so we never wake up with the far side of
// the sky frozen at yesterday's positions.
const FULL_REFRESH_JUMP_SIM_MS = 30_000;

export class SatelliteLayer {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly billboards: Cesium.BillboardCollection;
  private readonly pointIndex = new Map<number, Cesium.PointPrimitive>();
  private readonly billboardIndex = new Map<number, Cesium.Billboard>();
  private readonly colorByClass: Cesium.Color[];
  private readonly iconUrl: string;
  private readonly scratch = new Cesium.Cartesian3();
  private hoveredId: number | null = null;
  private selectedId: number | null = null;
  private catchupCursor = 0;
  private prevSnapSimMs: number | null = null;

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

  setHovered(noradId: number | null): void {
    if (this.hoveredId === noradId) return;
    const prev = this.hoveredId;
    this.hoveredId = noradId;
    if (prev != null) this.applyStyle(prev);
    if (noradId != null) this.applyStyle(noradId);
  }

  update(
    snap: PropagationSnapshot,
    filter: Set<OrbitClass>,
    highlightId: number | null,
    cameraEcef: Cesium.Cartesian3 | null,
  ): void {
    this.selectedId = highlightId;
    const filterMask = new Uint8Array(ORBIT_CLASSES.length);
    for (let i = 0; i < ORBIT_CLASSES.length; i++) {
      filterMask[i] = filter.has(ORBIT_CLASSES[i]) ? 1 : 0;
    }

    const { count, ids, ecefPos, orbitClass } = snap;

    // -- Rolling batch + full-refresh detection ---------------------------
    const simDt = this.prevSnapSimMs != null
      ? Math.abs(snap.timeMs - this.prevSnapSimMs)
      : Number.POSITIVE_INFINITY;
    this.prevSnapSimMs = snap.timeMs;

    // A discontinuity in sim time (Now / Jump…) → refresh everyone once.
    // First-ever snapshot also lands here because simDt starts at Infinity.
    const forceAll = simDt > FULL_REFRESH_JUMP_SIM_MS;

    // Rolling batch size scales with elapsed sim time so all sats get
    // refreshed within TARGET_STALE_SIM_MS of sim time. Paused (simDt = 0)
    // → 0 batch size (nothing's moving anyway).
    const rollingCount = forceAll
      ? count
      : Math.min(count, Math.ceil((count * simDt) / TARGET_STALE_SIM_MS));

    // Precompute the wrap-around window [catchupCursor, catchupCursor+rollingCount).
    const catchupEnd = this.catchupCursor + rollingCount;
    const catchupWraps = catchupEnd > count;
    const catchupHi = catchupWraps ? count : catchupEnd;
    const catchupLo2 = catchupWraps ? catchupEnd - count : 0;

    // -- Culling precomputation -------------------------------------------
    // Two-horizon test constants — undefined when camera unavailable or
    // inside the sphere (in which case we simply update everything).
    let cameraCulling = false;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let camTangentSq = 0;
    if (cameraEcef) {
      cx = cameraEcef.x;
      cy = cameraEcef.y;
      cz = cameraEcef.z;
      const cMagSq = cx * cx + cy * cy + cz * cz;
      if (cMagSq > EARTH_R_SQ * 1.001) {
        cameraCulling = true;
        camTangentSq = cMagSq - EARTH_R_SQ;
      }
    }

    const seen = new Set<number>();

    for (let n = 0; n < count; n++) {
      const cls = orbitClass[n];
      if (!filterMask[cls]) continue;
      const id = ids[n];
      seen.add(id);

      const sx = ecefPos[n * 3];
      const sy = ecefPos[n * 3 + 1];
      const sz = ecefPos[n * 3 + 2];

      // Visibility test — is the satellite above the camera's horizon?
      let visible = !cameraCulling;
      if (cameraCulling) {
        const dotCS = cx * sx + cy * sy + cz * sz;
        const sMagSq = sx * sx + sy * sy + sz * sz;
        const satTangentSq = sMagSq > EARTH_R_SQ ? sMagSq - EARTH_R_SQ : 0;
        visible = dotCS > EARTH_R_SQ - Math.sqrt(camTangentSq * satTangentSq);
      }

      // Rolling batch — force update for a wrapping slice each snapshot so
      // occluded satellites don't drift forever.
      const inRolling = forceAll
        ? true
        : catchupWraps
          ? n >= this.catchupCursor || n < catchupLo2
          : n >= this.catchupCursor && n < catchupHi;

      // Also always update selected/hovered so their styling is correct even
      // when they're technically behind the horizon.
      const alwaysUpdate = id === this.selectedId || id === this.hoveredId;

      if (!visible && !inRolling && !alwaysUpdate) continue;

      // -- Write path --------------------------------------------------
      this.scratch.x = sx;
      this.scratch.y = sy;
      this.scratch.z = sz;
      const color = this.colorByClass[cls];

      let p = this.pointIndex.get(id);
      if (!p) {
        p = this.points.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          color,
          pixelSize: 3,
          outlineWidth: 0,
          outlineColor: Cesium.Color.WHITE,
          translucencyByDistance: POINT_FADE,
          id,
        });
        this.pointIndex.set(id, p);
      } else {
        p.position = this.scratch;
        if (p.color !== color) p.color = color;
      }

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
      }

      this.applyStyle(id);
    }

    // Advance rolling cursor once per snapshot.
    this.catchupCursor = catchupEnd % count;

    // Reap primitives that dropped out of the current filter / catalog.
    // Note: we iterate `seen` from the loop above which added every slot the
    // filter accepted (visible or not), so this only removes truly-dropped
    // satellites — not culled ones.
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

  /** Apply the current hover/selection style to a single satellite. */
  private applyStyle(noradId: number): void {
    const p = this.pointIndex.get(noradId);
    const b = this.billboardIndex.get(noradId);
    const isSelected = this.selectedId === noradId;
    const isHovered = this.hoveredId === noradId;
    if (p) {
      const wantSize = isSelected ? 11 : isHovered ? 8 : 3;
      const wantOutline = isSelected ? 1.8 : isHovered ? 2.2 : 0;
      if (p.pixelSize !== wantSize) p.pixelSize = wantSize;
      if (p.outlineWidth !== wantOutline) p.outlineWidth = wantOutline;
      if (isHovered && !isSelected) {
        p.outlineColor = Cesium.Color.CYAN;
      } else {
        p.outlineColor = Cesium.Color.WHITE;
      }
    }
    if (b) {
      const wantScale = isSelected ? 0.95 : isHovered ? 0.7 : 0.5;
      if (b.scale !== wantScale) b.scale = wantScale;
    }
  }

  clear(): void {
    this.points.removeAll();
    this.billboards.removeAll();
    this.pointIndex.clear();
    this.billboardIndex.clear();
    this.catchupCursor = 0;
    this.prevSnapSimMs = null;
  }
}
