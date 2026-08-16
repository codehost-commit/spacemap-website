import * as Cesium from 'cesium';
import {
  LUNAR_SITE_KIND_COLOR,
  LUNAR_SURFACE_SITES,
  type LunarSiteKind,
  type LunarSurfaceSite,
} from '../simulation/lunar-surface-catalog.js';

/**
 * Pins the entire "things on the Moon" catalogue onto the LRO WAC mosaic:
 * Apollo landing sites, Luna and Surveyor probes, Chang'e, Chandrayaan,
 * SLIM, Blue Ghost, IM-1/2, plus the notable crashes and deliberate
 * impacts. See LUNAR_SURFACE_SITES for the full list.
 *
 * Visual language:
 *   • Crewed landings — golden diamond with a wider halo. Read as "special".
 *   • Robotic landings — cyan dot with white outline.
 *   • Crash sites    — red ring, not filled. Reads as "this ended here".
 *   • Deliberate impacts — violet star of David-ish four-point ring.
 *
 * Labels appear only when the camera is within ~4 000 km — otherwise a
 * hemisphere of pins turns into overlapping text on first zoom-out.
 * The selected site is always labelled, however far away.
 */

const LABEL_MAX_VIEW_DISTANCE_M = 4_000_000;
/** Pins float 5 km above the surface so they don't z-fight with the imagery. */
const MARKER_ELEVATION_M = 5000;

const BASE_POINT_SIZE = 8;
const HOVER_POINT_SIZE = 12;
const SELECTED_POINT_SIZE = 14;

/**
 * Pick-tag shape shared with the orbiter layer via the `lunar: true` flag
 * — the GlobeCanvas picker branches on which optional field is present.
 */
export interface LunarSurfacePickTag {
  lunar: true;
  surfaceId: string;
}

interface Entry {
  point: Cesium.PointPrimitive;
  ring: Cesium.PointPrimitive | null;
  label: Cesium.Label;
  def: LunarSurfaceSite;
}

export class LunarSurfaceMarkers {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly labels: Cesium.LabelCollection;
  private readonly byId = new Map<string, Entry>();
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private enabled = true;
  private visibleKinds: Set<LunarSiteKind> = new Set<LunarSiteKind>([
    'crewed',
    'lander',
    'crash',
    'impact',
  ]);

  constructor(private readonly viewer: Cesium.Viewer, private readonly scene = viewer.scene) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));

    for (const site of LUNAR_SURFACE_SITES) {
      const cart = Cesium.Cartesian3.fromDegrees(
        site.lon_deg,
        site.lat_deg,
        MARKER_ELEVATION_M,
      );
      const tag: LunarSurfacePickTag = { lunar: true, surfaceId: site.id };
      const color = Cesium.Color.fromCssColorString(LUNAR_SITE_KIND_COLOR[site.kind]);

      // Crashes and impacts render as an *outlined ring* — a filled dot
      // reads too much like a successful landing. We fake the ring with
      // a second primitive: a transparent fill with the coloured outline.
      const isRing = site.kind === 'crash' || site.kind === 'impact';
      const point = this.points.add({
        id: tag,
        position: cart,
        color: isRing ? color.withAlpha(0.08) : color.withAlpha(0.95),
        outlineColor: color.withAlpha(0.95),
        outlineWidth: isRing ? 2 : 1,
        pixelSize: BASE_POINT_SIZE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });

      // Crewed landings get an extra outer halo — a subtle "this one
      // matters" cue that reads clearly at any zoom.
      const ring =
        site.kind === 'crewed'
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

  setKindFilter(kinds: Iterable<LunarSiteKind>): void {
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
      // Labels also gated by view distance via distanceDisplayCondition —
      // this just hides them entirely when the kind is filtered off.
      entry.label.show = show;
    }
  }

  private applyStyles(): void {
    for (const [id, entry] of this.byId) {
      const isSelected = id === this.selectedId;
      const isHovered = !isSelected && id === this.hoveredId;
      const isRing = entry.def.kind === 'crash' || entry.def.kind === 'impact';
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
      // Selected label always visible (unset the range gate); everything
      // else falls back to the default distance-conditional gate.
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
