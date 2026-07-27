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
 * ## Band-based membership
 *
 * The `/selfdiagnose` report showed that FPS scales with *how many
 * primitives exist in the collections*, not just with what's drawn —
 * Cesium iterates every entry for GPU-state / sort / alpha resolution even
 * when the resolved alpha is zero. So beyond just position culling, we now
 * put each satellite into only the collection(s) whose distance band it
 * actually belongs to:
 *
 *   • Camera-to-sat distance below `POINT_DROP_BELOW_M` (2 500 km) → the
 *     point is fully transparent anyway, so the primitive is *removed*.
 *     Only the billboard remains.
 *   • Distance above `BILLBOARD_DROP_ABOVE_M` (27 500 km) → the billboard
 *     is fully transparent, so it's removed. Only the point remains.
 *   • In the fade zone → both exist, translucency handles the crossfade.
 *
 * Hysteresis (add-threshold widens the band) prevents oscillation at
 * boundaries. Membership is only *revisited* every ~500 ms (the
 * `BAND_CHECK_INTERVAL_MS`) so we don't churn primitives every frame —
 * positions themselves continue to update at every snapshot as normal.
 */

// LOD cross-fade thresholds in metres (camera-to-primitive distance).
const CLOSE_M = 3_000_000;
const FAR_M = 25_000_000;

const POINT_FADE = new Cesium.NearFarScalar(CLOSE_M, 0, FAR_M, 1);
const BILLBOARD_FADE = new Cesium.NearFarScalar(CLOSE_M, 1, FAR_M, 0);
const BILLBOARD_SCALE = new Cesium.NearFarScalar(400_000, 1.6, 20_000_000, 0.55);

// Band thresholds — points/billboards are removed when they're fully
// transparent, and the *add* threshold sits inside the *drop* threshold to
// give ~300 km of hysteresis so a satellite drifting near the boundary
// doesn't churn on/off every band check.
const POINT_DROP_BELOW_SQ = 2_500_000 ** 2;
const POINT_ADD_ABOVE_SQ = 2_800_000 ** 2;
const BILLBOARD_DROP_ABOVE_SQ = 27_500_000 ** 2;
const BILLBOARD_ADD_BELOW_SQ = 25_000_000 ** 2;
// How often we're allowed to *remove* primitives that fell out of their band.
// Additions happen instantly because a missing primitive is a correctness bug;
// deletions can wait so we don't churn the collection every frame.
const BAND_CHECK_INTERVAL_MS = 500;
// Tightened from 0.6/0.9 rad — 34°/51° margins were basically the whole
// hemisphere, so frustum culling did almost nothing. 10°/20° actually
// culls off-screen sats without introducing pop-in during small pans
// (release cone is 20° past the frustum, so a sat has to move quite a
// bit before being removed once it's tracked).
const VIEW_MARGIN_RAD = 0.17; // ≈ 10° extra beyond the frustum for adds
const VIEW_RELEASE_MARGIN_RAD = 0.35; // ≈ 20° for keeps (hysteresis)
const OFFSCREEN_NEAR_RESERVE_SQ = 12_000_000 ** 2;
const HORIZON_PREWARM_FACTOR = 1.18;

// Culling constants.
const EARTH_R_M = 6_378_137;
const EARTH_R_SQ = EARTH_R_M * EARTH_R_M;
const TARGET_STALE_SIM_MS = 12_000;
const FULL_REFRESH_JUMP_SIM_MS = 30_000;

export class SatelliteLayer {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly billboards: Cesium.BillboardCollection;
  private readonly pointIndex = new Map<number, Cesium.PointPrimitive>();
  private readonly billboardIndex = new Map<number, Cesium.Billboard>();
  private readonly colorByClass: Cesium.Color[];
  private readonly iconUrl: string;
  private readonly scratch = new Cesium.Cartesian3();
  private readonly filterMask = new Uint8Array(ORBIT_CLASSES.length);
  private readonly seenGeneration = new Map<number, number>();
  private readonly pointClassById = new Map<number, number>();
  private readonly billboardClassById = new Map<number, number>();
  private readonly pointPosById = new Map<number, Float64Array>();
  private readonly billboardPosById = new Map<number, Float64Array>();
  private hoveredId: number | null = null;
  private selectedId: number | null = null;
  private catchupCursor = 0;
  private prevSnapSimMs: number | null = null;
  private lastBandCheckMs = 0;
  private generation = 0;

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
    camera: Cesium.Camera | null,
  ): void {
    if (this.selectedId !== highlightId) {
      const prev = this.selectedId;
      this.selectedId = highlightId;
      if (prev != null) this.applyStyle(prev);
      if (highlightId != null) this.applyStyle(highlightId);
    }
    for (let i = 0; i < ORBIT_CLASSES.length; i++) {
      this.filterMask[i] = filter.has(ORBIT_CLASSES[i]) ? 1 : 0;
    }

    const { count, ids, ecefPos, orbitClass } = snap;

    // Rolling batch + full-refresh detection.
    const simDt =
      this.prevSnapSimMs != null ? Math.abs(snap.timeMs - this.prevSnapSimMs) : Number.POSITIVE_INFINITY;
    this.prevSnapSimMs = snap.timeMs;
    const forceAll = simDt > FULL_REFRESH_JUMP_SIM_MS;
    const rollingCount = forceAll
      ? count
      : Math.min(count, Math.ceil((count * simDt) / TARGET_STALE_SIM_MS));
    const catchupEnd = this.catchupCursor + rollingCount;
    const catchupWraps = catchupEnd > count;
    const catchupHi = catchupWraps ? count : catchupEnd;
    const catchupLo2 = catchupWraps ? catchupEnd - count : 0;

    // Culling precomputation.
    let cameraCulling = false;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let camTangentSq = 0;
    let dirX = 0;
    let dirY = 0;
    let dirZ = 0;
    let activeConeDot = -1;
    let releaseConeDot = -1;
    if (camera) {
      const cameraEcef = camera.positionWC;
      cx = cameraEcef.x;
      cy = cameraEcef.y;
      cz = cameraEcef.z;
      const cMagSq = cx * cx + cy * cy + cz * cz;
      if (cMagSq > EARTH_R_SQ * 1.001) {
        cameraCulling = true;
        camTangentSq = cMagSq - EARTH_R_SQ;
      }
      const dir = Cesium.Cartesian3.normalize(camera.directionWC, new Cesium.Cartesian3());
      dirX = dir.x;
      dirY = dir.y;
      dirZ = dir.z;
      const frustum = camera.frustum as Cesium.PerspectiveFrustum;
      const verticalHalfFov = (frustum.fov ?? Math.PI / 3) / 2;
      const horizontalHalfFov = Math.atan(
        Math.tan(verticalHalfFov) * (frustum.aspectRatio ?? 16 / 9),
      );
      const baseHalfAngle = Math.max(verticalHalfFov, horizontalHalfFov);
      activeConeDot = Math.cos(Math.min(Math.PI - 0.01, baseHalfAngle + VIEW_MARGIN_RAD));
      releaseConeDot = Math.cos(Math.min(Math.PI - 0.01, baseHalfAngle + VIEW_RELEASE_MARGIN_RAD));
    }

    // Band-check gating: additions happen every frame (correctness), removals
    // only every BAND_CHECK_INTERVAL_MS (perf).
    const nowMs = performance.now();
    const canRemoveThisTick = nowMs - this.lastBandCheckMs >= BAND_CHECK_INTERVAL_MS;
    if (canRemoveThisTick) this.lastBandCheckMs = nowMs;

    const generation = ++this.generation;

    for (let n = 0; n < count; n++) {
      const cls = orbitClass[n];
      if (!this.filterMask[cls]) continue;
      const id = ids[n];
      const sx = ecefPos[n * 3];
      const sy = ecefPos[n * 3 + 1];
      const sz = ecefPos[n * 3 + 2];
      const hadRenderable = this.pointIndex.has(id) || this.billboardIndex.has(id);

      // Visibility test.
      let visible = !cameraCulling;
      let frontish = !cameraCulling;
      if (cameraCulling) {
        const dotCS = cx * sx + cy * sy + cz * sz;
        const sMagSq = sx * sx + sy * sy + sz * sz;
        const satTangentSq = sMagSq > EARTH_R_SQ ? sMagSq - EARTH_R_SQ : 0;
        const horizonTerm = Math.sqrt(camTangentSq * satTangentSq);
        visible = dotCS > EARTH_R_SQ - horizonTerm;
        frontish = dotCS > EARTH_R_SQ - HORIZON_PREWARM_FACTOR * horizonTerm;
      }
      const inRolling = forceAll
        ? true
        : catchupWraps
          ? n >= this.catchupCursor || n < catchupLo2
          : n >= this.catchupCursor && n < catchupHi;
      const alwaysUpdate = id === this.selectedId || id === this.hoveredId;

      // Camera-distance² for band decisions (cheap: 3 subs + 3 muls + 2 adds).
      let camDistSq = 0;
      let inActiveCone = true;
      let inReleaseCone = true;
      if (cameraCulling) {
        const dx = sx - cx;
        const dy = sy - cy;
        const dz = sz - cz;
        camDistSq = dx * dx + dy * dy + dz * dz;
        const invDist = 1 / (Math.sqrt(camDistSq) || 1);
        const viewDot = (dx * dirX + dy * dirY + dz * dirZ) * invDist;
        inActiveCone = viewDot >= activeConeDot;
        inReleaseCone = viewDot >= releaseConeDot;
      }
      const nearReserve = cameraCulling && camDistSq <= OFFSCREEN_NEAR_RESERVE_SQ;
      const shouldRender =
        alwaysUpdate ||
        nearReserve ||
        (frontish && inActiveCone) ||
        (hadRenderable && frontish && inReleaseCone);
      if (!shouldRender) continue;
      this.seenGeneration.set(id, generation);

      // Whether each primitive kind is "wanted" (i.e., inside the add band).
      // No-camera fallback: keep both (matches previous behaviour).
      const wantPoint = !cameraCulling || camDistSq > POINT_ADD_ABOVE_SQ;
      const wantBillboard = !cameraCulling || camDistSq < BILLBOARD_ADD_BELOW_SQ;
      // "Forbidden" is inside the drop band — used to trigger removal.
      const forbidPoint = cameraCulling && camDistSq < POINT_DROP_BELOW_SQ;
      const forbidBillboard = cameraCulling && camDistSq > BILLBOARD_DROP_ABOVE_SQ;

      this.scratch.x = sx;
      this.scratch.y = sy;
      this.scratch.z = sz;
      const color = this.colorByClass[cls];

      // ---- Point primitive band management ----
      let p = this.pointIndex.get(id);
      if (p && forbidPoint && canRemoveThisTick) {
        this.points.remove(p);
        this.pointIndex.delete(id);
        this.pointClassById.delete(id);
        this.pointPosById.delete(id);
        p = undefined;
      }
      if (!p && wantPoint) {
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
        this.pointClassById.set(id, cls);
        this.pointPosById.set(id, new Float64Array([sx, sy, sz]));
        this.applyStyle(id);
      } else if (p) {
        const prevPos = this.pointPosById.get(id);
        if (!prevPos || prevPos[0] !== sx || prevPos[1] !== sy || prevPos[2] !== sz) {
          p.position = this.scratch;
          if (prevPos) {
            prevPos[0] = sx;
            prevPos[1] = sy;
            prevPos[2] = sz;
          } else {
            this.pointPosById.set(id, new Float64Array([sx, sy, sz]));
          }
        }
        if (this.pointClassById.get(id) !== cls) {
          p.color = color;
          this.pointClassById.set(id, cls);
        }
      }

      // ---- Billboard band management ----
      let b = this.billboardIndex.get(id);
      if (b && forbidBillboard && canRemoveThisTick) {
        this.billboards.remove(b);
        this.billboardIndex.delete(id);
        this.billboardClassById.delete(id);
        this.billboardPosById.delete(id);
        b = undefined;
      }
      if (!b && wantBillboard) {
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
        this.billboardClassById.set(id, cls);
        this.billboardPosById.set(id, new Float64Array([sx, sy, sz]));
        this.applyStyle(id);
      } else if (b) {
        const prevPos = this.billboardPosById.get(id);
        if (!prevPos || prevPos[0] !== sx || prevPos[1] !== sy || prevPos[2] !== sz) {
          b.position = this.scratch;
          if (prevPos) {
            prevPos[0] = sx;
            prevPos[1] = sy;
            prevPos[2] = sz;
          } else {
            this.billboardPosById.set(id, new Float64Array([sx, sy, sz]));
          }
        }
        if (this.billboardClassById.get(id) !== cls) {
          b.color = color;
          this.billboardClassById.set(id, cls);
        }
      }

      if (alwaysUpdate || inRolling || hadRenderable) this.applyStyle(id);
    }

    // Advance rolling cursor once per snapshot.
    this.catchupCursor = catchupEnd % count;

    // Reap primitives that dropped out of the current filter / catalog. This
    // is throttled to the same BAND_CHECK_INTERVAL_MS cadence as band-based
    // removals — running the reap every snapshot causes vertex-buffer churn
    // during camera pan (each Cesium remove marks the slot dirty and forces a
    // buffer recompact on the next collection update). Batching removals to
    // twice a second smooths the pan-release feel with no visible change,
    // since the zombie primitives are off-screen anyway. Sats behind Earth
    // stay in the collection an extra 0–500 ms after being culled; their GPU
    // cost during that window is negligible.
    if (canRemoveThisTick) {
      for (const [id, p] of this.pointIndex) {
        if (this.seenGeneration.get(id) !== generation) {
          this.points.remove(p);
          this.pointIndex.delete(id);
          this.pointClassById.delete(id);
          this.pointPosById.delete(id);
          this.seenGeneration.delete(id);
        }
      }
      for (const [id, b] of this.billboardIndex) {
        if (this.seenGeneration.get(id) !== generation) {
          this.billboards.remove(b);
          this.billboardIndex.delete(id);
          this.billboardClassById.delete(id);
          this.billboardPosById.delete(id);
          this.seenGeneration.delete(id);
        }
      }
    }
  }

  positionOf(noradId: number): Cesium.Cartesian3 | null {
    // Fall back to the billboard: at close range the point may have been
    // dropped by the band manager, but the billboard still exists and has
    // the same position.
    const p = this.pointIndex.get(noradId);
    if (p) return p.position;
    const b = this.billboardIndex.get(noradId);
    if (b) return b.position;
    return null;
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
    this.seenGeneration.clear();
    this.pointClassById.clear();
    this.billboardClassById.clear();
    this.pointPosById.clear();
    this.billboardPosById.clear();
    this.catchupCursor = 0;
    this.prevSnapSimMs = null;
    this.lastBandCheckMs = 0;
  }
}
