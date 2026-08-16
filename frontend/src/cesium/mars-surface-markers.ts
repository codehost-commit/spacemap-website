import * as Cesium from 'cesium';
import {
  MARS_SITE_KIND_COLOR,
  MARS_SURFACE_SITES,
  type MarsSiteKind,
  type MarsSurfaceSite,
} from '../simulation/mars-surface-catalog.js';

/**
 * Pins the entire "things on Mars" catalogue onto the Viking mosaic —
 * every rover, stationary lander, and crash site from Mars 2 (1971) to
 * Perseverance (2021). Same visual language as the lunar surface layer
 * so a user swapping bodies keeps the same "dots + rings + halos" mental
 * model:
 *
 *   • Rovers   — filled dot in mission-red with an outer halo (still-active
 *                objects deserve emphasis).
 *   • Landers  — filled dot in cyan with white outline.
 *   • Crashes  — hollow red ring, not filled. Reads as "this ended here".
 *
 * Cesium.Cartesian3.fromDegrees takes lon/lat in that order (E, N) and
 * places the point on Mars' ellipsoid — we set Ellipsoid.default = Mars
 * radius in globe.ts before this ever runs, so the pin sits on the surface.
 */

const LABEL_MAX_VIEW_DISTANCE_M = 8_000_000;
/** Pins float 8 km above surface — Mars OLM elevation varies ~20 km, so
 *  this clears typical MOLA relief without visibly floating at wide zoom. */
const MARKER_ELEVATION_M = 8_000;

const BASE_POINT_SIZE = 8;
const HOVER_POINT_SIZE = 12;
const SELECTED_POINT_SIZE = 14;

export interface MarsSurfacePickTag {
  mars: true;
  surfaceId: string;
}

interface Entry {
  point: Cesium.PointPrimitive;
  ring: Cesium.PointPrimitive | null;
  label: Cesium.Label;
  def: MarsSurfaceSite;
}

export class MarsSurfaceMarkers {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly labels: Cesium.LabelCollection;
  private readonly byId = new Map<string, Entry>();
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private enabled = true;
  private visibleKinds: Set<MarsSiteKind> = new Set<MarsSiteKind>(['rover', 'lander', 'crash']);

  constructor(private readonly viewer: Cesium.Viewer, private readonly scene = viewer.scene) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));

    for (const site of MARS_SURFACE_SITES) {
      const cart = Cesium.Cartesian3.fromDegrees(site.lon_deg, site.lat_deg, MARKER_ELEVATION_M);
      const tag: MarsSurfacePickTag = { mars: true, surfaceId: site.id };
      const color = Cesium.Color.fromCssColorString(MARS_SITE_KIND_COLOR[site.kind]);

      const isRing = site.kind === 'crash';
      const point = this.points.add({
        id: tag,
        position: cart,
        color: isRing ? color.withAlpha(0.08) : color.withAlpha(0.95),
        outlineColor: color.withAlpha(0.95),
        outlineWidth: isRing ? 2 : 1,
        pixelSize: BASE_POINT_SIZE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });

      // Rovers get the "this one is (or was) driving around" halo, mirroring
      // the crewed-landing halo on the Moon.
      const ring =
        site.kind === 'rover'
          ? this.points.add({
              id: tag,
              position: cart,
              color: color.withAlpha(0),
              outlineColor: color.withAlpha(0.35),
              outlineWidth: 1.5,
              pixelSize: BASE_POINT_SIZE + 8,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            })
          : null;

      const label = this.labels.add({
        position: cart,
        text: site.name,
        font: '11px "JetBrains Mono", "SF Mono", monospace',
        fillColor: color.withAlpha(0.95),
        outlineColor: new Cesium.Color(0, 0, 0, 0.9),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(10, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        eyeOffset: new Cesium.Cartesian3(0, 0, -50_000),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, LABEL_MAX_VIEW_DISTANCE_M),
        showBackground: true,
        backgroundColor: new Cesium.Color(0.02, 0.04, 0.08, 0.6),
        backgroundPadding: new Cesium.Cartesian2(6, 3),
      });

      this.byId.set(site.id, { point, ring, label, def: site });
    }

    this.applyVisibility();
  }

  destroy(): void {
    try {
      this.scene.primitives.remove(this.points);
    } catch {
      /* viewer torn down */
    }
    try {
      this.scene.primitives.remove(this.labels);
    } catch {
      /* viewer torn down */
    }
    this.byId.clear();
  }

  setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    this.applyVisibility();
  }

  setKindFilter(kinds: Iterable<MarsSiteKind>): void {
    this.visibleKinds = new Set(kinds);
    this.applyVisibility();
  }

  setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.applyStyles();
  }

  setSelected(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.applyStyles();
    this.applyVisibility();
  }

  positionOf(id: string): Cesium.Cartesian3 | null {
    const entry = this.byId.get(id);
    return entry ? entry.point.position.clone() : null;
  }

  private applyVisibility(): void {
    const layerOn = this.enabled;
    for (const [id, entry] of this.byId) {
      const kindOn = this.visibleKinds.has(entry.def.kind);
      const alwaysShowSelected = id === this.selectedId;
      const show = layerOn && (kindOn || alwaysShowSelected);
      entry.point.show = show;
      if (entry.ring) entry.ring.show = show;
      entry.label.show = show;
    }
  }

  private applyStyles(): void {
    for (const [id, entry] of this.byId) {
      const isSelected = id === this.selectedId;
      const isHovered = !isSelected && id === this.hoveredId;
      const isRing = entry.def.kind === 'crash';
      if (isSelected) {
        entry.point.pixelSize = SELECTED_POINT_SIZE;
        entry.point.outlineWidth = isRing ? 3 : 2;
      } else if (isHovered) {
        entry.point.pixelSize = HOVER_POINT_SIZE;
        entry.point.outlineWidth = isRing ? 2.5 : 1.5;
      } else {
        entry.point.pixelSize = BASE_POINT_SIZE;
        entry.point.outlineWidth = isRing ? 2 : 1;
      }
      if (isSelected) {
        entry.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, 1e9);
      } else {
        entry.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
          0,
          LABEL_MAX_VIEW_DISTANCE_M,
        );
      }
    }
  }
}
