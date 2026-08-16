import * as Cesium from 'cesium';
import { LUNAR_KIND_COLOR, findLunarOrbiter } from '../simulation/lunar-catalog.js';
import {
  bodyFixedPosition,
  orbitalPeriodSec,
} from '../simulation/lunar-propagator.js';

/**
 * The Moon-side answer to OrbitTrail — a trailing ribbon along one full
 * orbital period behind the selected lunar spacecraft. Same visual language
 * (fade from head to tail, per-vertex colour) so switching from an Earth
 * orbit to a lunar one feels continuous.
 *
 * We rebuild the polyline every REFRESH_MS, which is a cheap way to keep
 * long-period trails (Queqiao-2 at 12 h, CAPSTONE at ~6 d) visually
 * consistent as the Moon rotates under them. For sub-2-hour orbits like
 * LRO one full period fits in ~200 samples and stays smooth even at high
 * time-warp multipliers.
 */
const REFRESH_MS = 500;
const SAMPLES = 220;
/** Long-period orbits (halos, ELFOs) cap here so a 6-day CAPSTONE trail
 *  doesn't melt the browser rebuilding across ~7 000 seconds of samples. */
const MAX_SPAN_HOURS = 24;

export class LunarOrbitTrail {
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
    // Force an immediate rebuild so the ribbon appears on click without
    // waiting for the next REFRESH tick.
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
    const orbiter = findLunarOrbiter(this.orbiterId);
    if (!orbiter) return;

    const periodSec = orbitalPeriodSec(orbiter.orbit.a_km);
    const spanSec = Math.min(periodSec, MAX_SPAN_HOURS * 3600);
    const dtSec = spanSec / (SAMPLES - 1);
    const now = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const startMs = now.getTime() - spanSec * 1000;

    const positions: Cesium.Cartesian3[] = new Array(SAMPLES);
    const colors: Cesium.Color[] = new Array(SAMPLES);
    const baseColor = Cesium.Color.fromCssColorString(LUNAR_KIND_COLOR[orbiter.kind]);

    for (let i = 0; i < SAMPLES; i++) {
      const t = new Date(startMs + i * dtSec * 1000);
      const pos = bodyFixedPosition(orbiter.orbit, t);
      positions[i] = new Cesium.Cartesian3(pos.x * 1000, pos.y * 1000, pos.z * 1000);
      // Alpha ramps from ~0 (tail) to 1 (head, on the spacecraft).
      const alpha = 0.05 + 0.95 * (i / (SAMPLES - 1));
      colors[i] = new Cesium.Color(baseColor.red, baseColor.green, baseColor.blue, alpha);
    }

    // Cheapest correct way to update geometry + per-vertex colours in
    // Cesium is to destroy and rebuild the Primitive — same trick the
    // Earth OrbitTrail uses.
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
