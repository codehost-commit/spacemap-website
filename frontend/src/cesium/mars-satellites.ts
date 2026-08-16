import * as Cesium from 'cesium';
import {
  MARS_KIND_COLOR,
  MARS_ORBITERS,
  type MarsOrbiter,
} from '../simulation/mars-catalog.js';
import { bodyFixedPosition, sampleOrbit } from '../simulation/mars-propagator.js';

/**
 * Renders the full Mars-orbiter catalogue as points (+ labels) on the
 * Mars globe. Direct twin of LunarSatellites — same rendering primitives,
 * same hover/select styling, same per-frame propagation. The only Mars-
 * specific bit is dropping the eclipse-dim path: Cesium's sun position is
 * Earth-centred, so a "Mars in shadow" check based on it would be off by
 * up to ~40° and give the wrong orbiters the wrong dimming. Better to
 * leave them all rendered at full colour than to lie visually.
 */

const SELECTED_OUTLINE_WIDTH = 3;
const HOVER_OUTLINE_WIDTH = 2;
const BASE_POINT_SIZE = 10;
const SELECTED_POINT_SIZE = 14;
const HOVER_POINT_SIZE = 12;
const LABEL_MAX_VIEW_DISTANCE_M = 45_000_000; // Mars is ~2× the Moon radius

/**
 * Cesium picks return the primitive-level `id` field verbatim, so we tag
 * every point with a `{ mars: true, orbiterId }` object — GlobeCanvas
 * checks `mars` to route this to the Mars selection action.
 */
export interface MarsPickTag {
  mars: true;
  orbiterId: string;
}

export class MarsSatellites {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly labels: Cesium.LabelCollection;
  private readonly byId = new Map<
    string,
    { point: Cesium.PointPrimitive; label: Cesium.Label; def: MarsOrbiter }
  >();
  private preRenderDispose: (() => void) | null = null;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly scene = viewer.scene,
  ) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection({ scene }));

    for (const orbiter of MARS_ORBITERS) {
      const color = Cesium.Color.fromCssColorString(MARS_KIND_COLOR[orbiter.kind]);
      const tag: MarsPickTag = { mars: true, orbiterId: orbiter.id };
      const point = this.points.add({
        id: tag,
        position: new Cesium.Cartesian3(0, 0, 0),
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

  /** Latest body-fixed position (m, Cesium Cartesian3) of one orbiter. */
  positionOf(id: string): Cesium.Cartesian3 | null {
    const entry = this.byId.get(id);
    return entry ? entry.point.position.clone() : null;
  }

  private tick(): void {
    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    for (const [id, { point, label, def }] of this.byId) {
      const pos = bodyFixedPosition(def.orbit, date);
      const cart = new Cesium.Cartesian3(pos.x * 1000, pos.y * 1000, pos.z * 1000);
      point.position = cart;
      label.position = cart;

      const base = Cesium.Color.fromCssColorString(MARS_KIND_COLOR[def.kind]);
      point.color = base.withAlpha(0.95);
      label.fillColor = base.withAlpha(0.95);

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

  private refreshStyles(): void {
    this.tick();
  }

  /** Convenience — sample a Mars orbit at `date` for the telemetry panel. */
  static sample(id: string, date: Date) {
    const orbiter = MARS_ORBITERS.find((o) => o.id === id);
    if (!orbiter) return null;
    return { orbiter, sample: sampleOrbit(orbiter.orbit, date) };
  }
}
