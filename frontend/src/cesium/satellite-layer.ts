import * as Cesium from 'cesium';
import {
  CATALOG_OBJECT_TYPES,
  ORBIT_CLASSES,
  ORBIT_CLASS_COLOR,
  type CatalogObjectType,
  type OrbitClass,
  type PropagationSnapshot,
} from '@spacemap/shared';
import { buildObjectDetailIcon, buildObjectMarkerIcon } from './satellite-icon.js';

/**
 * Renders satellites at two levels of detail:
 *   • Marker billboard — compact type-specific shape, visible when far.
 *   • Detail billboard — richer type-specific silhouette, fades in as the
 *                        camera approaches.
 *
 * We still band-limit membership so each object only exists in the
 * collection(s) whose distance range can actually draw it.
 */

// LOD cross-fade thresholds in metres (camera-to-primitive distance).
const CLOSE_M = 3_000_000;
const FAR_M = 25_000_000;

const MARKER_FADE = new Cesium.NearFarScalar(CLOSE_M, 0, FAR_M, 1);
const DETAIL_FADE = new Cesium.NearFarScalar(CLOSE_M, 1, FAR_M, 0);
const MARKER_SCALE = new Cesium.NearFarScalar(400_000, 1.18, 20_000_000, 0.9);
const DETAIL_SCALE = new Cesium.NearFarScalar(400_000, 1.6, 20_000_000, 0.55);

// Band thresholds — markers/detail billboards are removed when they're fully
// transparent, and the add threshold sits inside the drop threshold to avoid
// churn when a satellite hovers near the band boundary.
const MARKER_DROP_BELOW_SQ = 2_500_000 ** 2;
const MARKER_ADD_ABOVE_SQ = 2_800_000 ** 2;
const DETAIL_DROP_ABOVE_SQ = 27_500_000 ** 2;
const DETAIL_ADD_BELOW_SQ = 25_000_000 ** 2;
const BAND_CHECK_INTERVAL_MS = 500;
const VIEW_MARGIN_RAD = 0.17;
const VIEW_RELEASE_MARGIN_RAD = 0.35;
const OFFSCREEN_NEAR_RESERVE_SQ = 12_000_000 ** 2;
const HORIZON_PREWARM_FACTOR = 1.18;

const EARTH_R_M = 6_378_137;
const EARTH_R_SQ = EARTH_R_M * EARTH_R_M;
const TARGET_STALE_SIM_MS = 12_000;
const FULL_REFRESH_JUMP_SIM_MS = 30_000;

const DEFAULT_MARKER_SCALE = 0.94;
const DEFAULT_DETAIL_SCALE = 0.54;

function buildTypeIconMap(builder: (kind: CatalogObjectType) => string): Record<CatalogObjectType, string> {
  return {
    payload: builder('payload'),
    'rocket-body': builder('rocket-body'),
    debris: builder('debris'),
    unknown: builder('unknown'),
  };
}

export class SatelliteLayer {
  private readonly markers: Cesium.BillboardCollection;
  private readonly billboards: Cesium.BillboardCollection;
  private readonly markerIndex = new Map<number, Cesium.Billboard>();
  private readonly billboardIndex = new Map<number, Cesium.Billboard>();
  private readonly colorByClass: Cesium.Color[];
  private readonly hoverColorByClass: Cesium.Color[];
  private readonly selectedColorByClass: Cesium.Color[];
  private readonly markerIconByType: Record<CatalogObjectType, string>;
  private readonly detailIconByType: Record<CatalogObjectType, string>;
  private readonly scratch = new Cesium.Cartesian3();
  private readonly filterMask = new Uint8Array(ORBIT_CLASSES.length);
  private readonly objectFilterMask = new Uint8Array(CATALOG_OBJECT_TYPES.length);
  private readonly seenGeneration = new Map<number, number>();
  private readonly markerClassById = new Map<number, number>();
  private readonly billboardClassById = new Map<number, number>();
  private readonly markerPosById = new Map<number, Float64Array>();
  private readonly billboardPosById = new Map<number, Float64Array>();
  private readonly markerTypeById = new Map<number, CatalogObjectType>();
  private readonly billboardTypeById = new Map<number, CatalogObjectType>();
  private hoveredId: number | null = null;
  private selectedId: number | null = null;
  private catchupCursor = 0;
  private prevSnapSimMs: number | null = null;
  private lastBandCheckMs = 0;
  private generation = 0;

  constructor(scene: Cesium.Scene) {
    this.markers = scene.primitives.add(new Cesium.BillboardCollection({ scene }));
    this.billboards = scene.primitives.add(new Cesium.BillboardCollection({ scene }));
    this.colorByClass = ORBIT_CLASSES.map((cls: OrbitClass) => {
      const c = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[cls]);
      c.alpha = 0.95;
      return c;
    });
    this.hoverColorByClass = this.colorByClass.map((color) =>
      Cesium.Color.lerp(color, Cesium.Color.WHITE, 0.24, new Cesium.Color()),
    );
    this.selectedColorByClass = this.colorByClass.map((color) =>
      Cesium.Color.lerp(color, Cesium.Color.WHITE, 0.42, new Cesium.Color()),
    );
    this.markerIconByType = buildTypeIconMap((kind) => buildObjectMarkerIcon(kind));
    this.detailIconByType = buildTypeIconMap((kind) => buildObjectDetailIcon(kind));
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
    objectFilter: Set<CatalogObjectType>,
    objectTypeByNorad: Map<number, CatalogObjectType>,
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
    for (let i = 0; i < CATALOG_OBJECT_TYPES.length; i++) {
      this.objectFilterMask[i] = objectFilter.has(CATALOG_OBJECT_TYPES[i]) ? 1 : 0;
    }

    const { count, ids, ecefPos, orbitClass } = snap;

    const simDt =
      this.prevSnapSimMs != null
        ? Math.abs(snap.timeMs - this.prevSnapSimMs)
        : Number.POSITIVE_INFINITY;
    this.prevSnapSimMs = snap.timeMs;
    const forceAll = simDt > FULL_REFRESH_JUMP_SIM_MS;
    const rollingCount = forceAll
      ? count
      : Math.min(count, Math.ceil((count * simDt) / TARGET_STALE_SIM_MS));
    const catchupEnd = this.catchupCursor + rollingCount;
    const catchupWraps = catchupEnd > count;
    const catchupHi = catchupWraps ? count : catchupEnd;
    const catchupLo2 = catchupWraps ? catchupEnd - count : 0;

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

    const nowMs = performance.now();
    const canRemoveThisTick = nowMs - this.lastBandCheckMs >= BAND_CHECK_INTERVAL_MS;
    if (canRemoveThisTick) this.lastBandCheckMs = nowMs;

    const generation = ++this.generation;

    for (let n = 0; n < count; n++) {
      const cls = orbitClass[n];
      const id = ids[n];
      const objectType = objectTypeByNorad.get(id) ?? 'unknown';
      const objectTypeIndex = CATALOG_OBJECT_TYPES.indexOf(objectType);
      const objectVisible =
        objectTypeIndex >= 0 ? this.objectFilterMask[objectTypeIndex] === 1 : true;
      const classVisible = this.filterMask[cls] === 1;
      const alwaysUpdate = id === this.selectedId || id === this.hoveredId;
      if ((!classVisible || !objectVisible) && !alwaysUpdate) continue;

      const sx = ecefPos[n * 3];
      const sy = ecefPos[n * 3 + 1];
      const sz = ecefPos[n * 3 + 2];
      const hadRenderable = this.markerIndex.has(id) || this.billboardIndex.has(id);

      let frontish = !cameraCulling;
      if (cameraCulling) {
        const dotCS = cx * sx + cy * sy + cz * sz;
        const sMagSq = sx * sx + sy * sy + sz * sz;
        const satTangentSq = sMagSq > EARTH_R_SQ ? sMagSq - EARTH_R_SQ : 0;
        const horizonTerm = Math.sqrt(camTangentSq * satTangentSq);
        frontish = dotCS > EARTH_R_SQ - HORIZON_PREWARM_FACTOR * horizonTerm;
      }

      const inRolling = forceAll
        ? true
        : catchupWraps
          ? n >= this.catchupCursor || n < catchupLo2
          : n >= this.catchupCursor && n < catchupHi;

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

      const wantMarker = !cameraCulling || camDistSq > MARKER_ADD_ABOVE_SQ;
      const wantBillboard = !cameraCulling || camDistSq < DETAIL_ADD_BELOW_SQ;
      const forbidMarker = cameraCulling && camDistSq < MARKER_DROP_BELOW_SQ;
      const forbidBillboard = cameraCulling && camDistSq > DETAIL_DROP_ABOVE_SQ;

      this.scratch.x = sx;
      this.scratch.y = sy;
      this.scratch.z = sz;

      let marker = this.markerIndex.get(id);
      if (marker && forbidMarker && canRemoveThisTick) {
        this.markers.remove(marker);
        this.markerIndex.delete(id);
        this.markerClassById.delete(id);
        this.markerPosById.delete(id);
        this.markerTypeById.delete(id);
        marker = undefined;
      }
      if (!marker && wantMarker) {
        marker = this.markers.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          image: this.markerIconByType[objectType],
          color: this.colorByClass[cls],
          scale: DEFAULT_MARKER_SCALE,
          scaleByDistance: MARKER_SCALE,
          translucencyByDistance: MARKER_FADE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          id,
        });
        this.markerIndex.set(id, marker);
        this.markerClassById.set(id, cls);
        this.markerPosById.set(id, new Float64Array([sx, sy, sz]));
        this.markerTypeById.set(id, objectType);
        this.applyStyle(id);
      } else if (marker) {
        const prevPos = this.markerPosById.get(id);
        if (!prevPos || prevPos[0] !== sx || prevPos[1] !== sy || prevPos[2] !== sz) {
          marker.position = this.scratch;
          if (prevPos) {
            prevPos[0] = sx;
            prevPos[1] = sy;
            prevPos[2] = sz;
          } else {
            this.markerPosById.set(id, new Float64Array([sx, sy, sz]));
          }
        }
        if (this.markerTypeById.get(id) !== objectType) {
          marker.image = this.markerIconByType[objectType];
          this.markerTypeById.set(id, objectType);
        }
        if (this.markerClassById.get(id) !== cls) {
          this.markerClassById.set(id, cls);
          this.applyStyle(id);
        }
      }

      let billboard = this.billboardIndex.get(id);
      if (billboard && forbidBillboard && canRemoveThisTick) {
        this.billboards.remove(billboard);
        this.billboardIndex.delete(id);
        this.billboardClassById.delete(id);
        this.billboardPosById.delete(id);
        this.billboardTypeById.delete(id);
        billboard = undefined;
      }
      if (!billboard && wantBillboard) {
        billboard = this.billboards.add({
          position: Cesium.Cartesian3.clone(this.scratch),
          image: this.detailIconByType[objectType],
          color: this.colorByClass[cls],
          scale: DEFAULT_DETAIL_SCALE,
          scaleByDistance: DETAIL_SCALE,
          translucencyByDistance: DETAIL_FADE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          id,
        });
        this.billboardIndex.set(id, billboard);
        this.billboardClassById.set(id, cls);
        this.billboardPosById.set(id, new Float64Array([sx, sy, sz]));
        this.billboardTypeById.set(id, objectType);
        this.applyStyle(id);
      } else if (billboard) {
        const prevPos = this.billboardPosById.get(id);
        if (!prevPos || prevPos[0] !== sx || prevPos[1] !== sy || prevPos[2] !== sz) {
          billboard.position = this.scratch;
          if (prevPos) {
            prevPos[0] = sx;
            prevPos[1] = sy;
            prevPos[2] = sz;
          } else {
            this.billboardPosById.set(id, new Float64Array([sx, sy, sz]));
          }
        }
        if (this.billboardTypeById.get(id) !== objectType) {
          billboard.image = this.detailIconByType[objectType];
          this.billboardTypeById.set(id, objectType);
        }
        if (this.billboardClassById.get(id) !== cls) {
          this.billboardClassById.set(id, cls);
          this.applyStyle(id);
        }
      }

      if (alwaysUpdate || inRolling || hadRenderable) this.applyStyle(id);
    }

    this.catchupCursor = catchupEnd % count;

    if (canRemoveThisTick) {
      for (const [id, marker] of this.markerIndex) {
        if (this.seenGeneration.get(id) !== generation) {
          this.markers.remove(marker);
          this.markerIndex.delete(id);
          this.markerClassById.delete(id);
          this.markerPosById.delete(id);
          this.markerTypeById.delete(id);
          this.seenGeneration.delete(id);
        }
      }
      for (const [id, billboard] of this.billboardIndex) {
        if (this.seenGeneration.get(id) !== generation) {
          this.billboards.remove(billboard);
          this.billboardIndex.delete(id);
          this.billboardClassById.delete(id);
          this.billboardPosById.delete(id);
          this.billboardTypeById.delete(id);
          this.seenGeneration.delete(id);
        }
      }
    }
  }

  positionOf(noradId: number): Cesium.Cartesian3 | null {
    const billboard = this.billboardIndex.get(noradId);
    if (billboard) return billboard.position;
    const marker = this.markerIndex.get(noradId);
    if (marker) return marker.position;
    return null;
  }

  private resolveColor(classIndex: number | undefined, hovered: boolean, selected: boolean): Cesium.Color {
    if (typeof classIndex !== 'number' || classIndex < 0 || classIndex >= this.colorByClass.length) {
      return Cesium.Color.WHITE;
    }
    if (selected) return this.selectedColorByClass[classIndex];
    if (hovered) return this.hoverColorByClass[classIndex];
    return this.colorByClass[classIndex];
  }

  private applyStyle(noradId: number): void {
    const marker = this.markerIndex.get(noradId);
    const billboard = this.billboardIndex.get(noradId);
    const isSelected = this.selectedId === noradId;
    const isHovered = this.hoveredId === noradId;
    const classIndex =
      this.billboardClassById.get(noradId) ?? this.markerClassById.get(noradId);
    const color = this.resolveColor(classIndex, isHovered, isSelected);

    if (marker) {
      const wantScale = isSelected ? 1.38 : isHovered ? 1.16 : DEFAULT_MARKER_SCALE;
      if (marker.scale !== wantScale) marker.scale = wantScale;
      if (marker.color !== color) marker.color = color;
    }
    if (billboard) {
      const wantScale = isSelected ? 1.02 : isHovered ? 0.76 : DEFAULT_DETAIL_SCALE;
      if (billboard.scale !== wantScale) billboard.scale = wantScale;
      if (billboard.color !== color) billboard.color = color;
    }
  }

  clear(): void {
    this.markers.removeAll();
    this.billboards.removeAll();
    this.markerIndex.clear();
    this.billboardIndex.clear();
    this.seenGeneration.clear();
    this.markerClassById.clear();
    this.billboardClassById.clear();
    this.markerPosById.clear();
    this.billboardPosById.clear();
    this.markerTypeById.clear();
    this.billboardTypeById.clear();
    this.catchupCursor = 0;
    this.prevSnapSimMs = null;
    this.lastBandCheckMs = 0;
  }
}
