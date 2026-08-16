import * as Cesium from 'cesium';
import {
  LUNAR_KIND_COLOR,
  LUNAR_ORBITERS,
  type LunarOrbiter,
} from '../simulation/lunar-catalog.js';
import {
  bodyFixedPosition,
  isSunlit,
  sampleOrbit,
} from '../simulation/lunar-propagator.js';

/**
 * Renders the full lunar-orbiter catalogue as points (+ labels) on the
 * Moon globe. Each orbiter gets:
 *   • A point primitive whose colour comes from LUNAR_KIND_COLOR, dimmed
 *     when the spacecraft is currently in the Moon's shadow.
 *   • A label with the orbiter's name, hidden past a comfortable range so
 *     the far side of the Moon doesn't turn into text soup.
 *   • Hover / select rings, styled to match the Earth satellite layer's
 *     visual language (bright outer ring on selection, subtler on hover).
 *
 * Positions are recomputed every frame from the Cesium clock, so time
 * travel and the timeline scrubber sweep the orbiters through their orbits
 * exactly like Earth's SGP4 propagator does — no separate worker needed
 * because we only have a handful of objects to update.
 */
const SELECTED_OUTLINE_WIDTH = 3;
const HOVER_OUTLINE_WIDTH = 2;
const BASE_POINT_SIZE = 10;
const SELECTED_POINT_SIZE = 14;
const HOVER_POINT_SIZE = 12;
const LABEL_MAX_VIEW_DISTANCE_M = 25_000_000;

/**
 * Cesium picks return the primitive-level `id` field verbatim, so we tag
 * every point with an object of shape `{ lunar: true, orbiterId }` — the
 * GlobeCanvas picker branches on the presence of the `lunar` flag to route
 * to the lunar select action instead of the Earth NORAD handler.
 */
export interface LunarPickTag {
  lunar: true;
  orbiterId: string;
}

export class LunarSatellites {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly labels: Cesium.LabelCollection;
  private readonly byId = new Map<string, { point: Cesium.PointPrimitive; label: Cesium.Label; def: LunarOrbiter }>();
  private preRenderDispose: (() => void) | null = null;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly scene = viewer.scene,
  ) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));

    for (const orbiter of LUNAR_ORBITERS) {
      const color = Cesium.Color.fromCssColorString(LUNAR_KIND_COLOR[orbiter.kind]);
      const tag: LunarPickTag = { lunar: true, orbiterId: orbiter.id };
      const point = this.points.add({
        id: tag,
        position: new Cesium.Cartesian3(0, 0, 0), // seeded, updated in tick
        color,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
        outlineWidth: 0,
        pixelSize: BASE_POINT_SIZE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      const label = this.labels.add({
        position: new Cesium.Cartesian3(0, 0, 0),
        text: orbiter.name,
        font: '11px "JetBrains Mono", "SF Mono", monospace',
        fillColor: color.withAlpha(0.95),
        outlineColor: new Cesium.Color(0, 0, 0, 0.85),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(10, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        eyeOffset: new Cesium.Cartesian3(0, 0, -100_000),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, LABEL_MAX_VIEW_DISTANCE_M),
        showBackground: true,
        backgroundColor: new Cesium.Color(0.02, 0.04, 0.08, 0.6),
        backgroundPadding: new Cesium.Cartesian2(6, 3),
      });
      this.byId.set(orbiter.id, { point, label, def: orbiter });
    }

    // Recompute all positions every pre-render — the catalogue is tiny
    // (5 objects) so per-frame updates are trivially cheap and give us
    // silky smooth motion at any time-warp multiplier.
    this.preRenderDispose = scene.preRender.addEventListener(() => this.tick());
    this.tick();
  }

  destroy(): void {
    this.preRenderDispose?.();
    this.preRenderDispose = null;
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

  setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.refreshStyles();
  }

  setSelected(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.refreshStyles();
  }

  /** Latest body-fixed position (km) of one orbiter, or null if unknown. */
  positionOf(id: string): Cesium.Cartesian3 | null {
    const entry = this.byId.get(id);
    return entry ? entry.point.position.clone() : null;
  }

  private tick(): void {
    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    for (const [id, { point, label, def }] of this.byId) {
      const pos = bodyFixedPosition(def.orbit, date);
      // km → m for Cesium
      const cart = new Cesium.Cartesian3(pos.x * 1000, pos.y * 1000, pos.z * 1000);
      point.position = cart;
      label.position = cart;

      // Dim eclipsed sats — same visual language as Earth's day/night sats.
      const lit = isSunlit(pos, date);
      const base = Cesium.Color.fromCssColorString(LUNAR_KIND_COLOR[def.kind]);
      point.color = lit ? base.withAlpha(0.95) : base.withAlpha(0.42);
      label.fillColor = lit ? base.withAlpha(0.95) : base.withAlpha(0.55);

      // Selection / hover styling: outline + slightly larger dot.
      const isSelected = id === this.selectedId;
      const isHovered = !isSelected && id === this.hoveredId;
      if (isSelected) {
        point.outlineWidth = SELECTED_OUTLINE_WIDTH;
        point.outlineColor = Cesium.Color.WHITE.withAlpha(0.95);
        point.pixelSize = SELECTED_POINT_SIZE;
      } else if (isHovered) {
        point.outlineWidth = HOVER_OUTLINE_WIDTH;
        point.outlineColor = Cesium.Color.WHITE.withAlpha(0.6);
        point.pixelSize = HOVER_POINT_SIZE;
      } else {
        point.outlineWidth = 0;
        point.pixelSize = BASE_POINT_SIZE;
      }
    }
  }

  /**
   * Force a style pass without waiting for the next preRender — makes hover
   * and click feedback feel instant instead of one frame late.
   */
  private refreshStyles(): void {
    this.tick();
  }

  /** Convenience — sample a lunar orbit at `date` for the telemetry panel. */
  static sample(id: string, date: Date) {
    const orbiter = LUNAR_ORBITERS.find((o) => o.id === id);
    if (!orbiter) return null;
    return { orbiter, sample: sampleOrbit(orbiter.orbit, date) };
  }
}
