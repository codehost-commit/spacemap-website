import * as Cesium from 'cesium';
import { MARS_KIND_COLOR, findMarsOrbiter } from '../simulation/mars-catalog.js';
import { bodyFixedPosition, orbitalPeriodSec } from '../simulation/mars-propagator.js';

/**
 * Mars-side twin of LunarOrbitTrail. Draws a trailing ribbon along one
 * full orbital period behind the selected Mars spacecraft, with per-vertex
 * fade from tail to head. Cap the span so Hope's 55-hour orbit doesn't
 * spend 7,000 samples of geometry per rebuild.
 */
const REFRESH_MS = 500;
const SAMPLES = 240;
const MAX_SPAN_HOURS = 30;

export class MarsOrbitTrail {
  private polyline: Cesium.Primitive | null = null;
  private orbiterId: string | null = null;
  private lastBuildMs = 0;
  private tickDispose: (() => void) | null = null;
  private readonly scene: Cesium.Scene;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.scene = viewer.scene;
    this.tickDispose = this.scene.preRender.addEventListener(() => this.maybeRebuild());
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    this.clear();
  }

  setFromOrbiterId(id: string | null): void {
    this.orbiterId = id;
    if (!id) {
      this.clear();
      return;
    }
    this.lastBuildMs = 0;
    this.rebuild();
  }

  clear(): void {
    if (this.polyline) {
      try {
        this.scene.primitives.remove(this.polyline);
      } catch {
        /* viewer torn down */
      }
      this.polyline = null;
    }
    this.lastBuildMs = 0;
  }

  private maybeRebuild(): void {
    if (!this.orbiterId) return;
    const now = performance.now();
    if (now - this.lastBuildMs < REFRESH_MS) return;
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.orbiterId) return;
    const orbiter = findMarsOrbiter(this.orbiterId);
    if (!orbiter) return;

    const periodSec = orbitalPeriodSec(orbiter.orbit.a_km);
    const spanSec = Math.min(periodSec, MAX_SPAN_HOURS * 3600);
    const dtSec = spanSec / (SAMPLES - 1);
    const now = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const startMs = now.getTime() - spanSec * 1000;

    const positions: Cesium.Cartesian3[] = new Array(SAMPLES);
    const colors: Cesium.Color[] = new Array(SAMPLES);
    const baseColor = Cesium.Color.fromCssColorString(MARS_KIND_COLOR[orbiter.kind]);

    for (let i = 0; i < SAMPLES; i++) {
      const t = new Date(startMs + i * dtSec * 1000);
      const pos = bodyFixedPosition(orbiter.orbit, t);
      positions[i] = new Cesium.Cartesian3(pos.x * 1000, pos.y * 1000, pos.z * 1000);
      const alpha = 0.05 + 0.95 * (i / (SAMPLES - 1));
      colors[i] = new Cesium.Color(baseColor.red, baseColor.green, baseColor.blue, alpha);
    }

    if (this.polyline) {
      try {
        this.scene.primitives.remove(this.polyline);
      } catch {
        /* torn down */
      }
      this.polyline = null;
    }
    this.polyline = this.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 2.4,
            colors,
            colorsPerVertex: true,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
          }),
        }),
        appearance: new Cesium.PolylineColorAppearance({ translucent: true }),
        asynchronous: false,
      }),
    );
    this.lastBuildMs = performance.now();
  }
}
