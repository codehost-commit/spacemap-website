import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import type { Tle } from '@spacemap/shared';
import { catalogObjectToSatRec } from '../simulation/catalog-satrec.js';

/**
 * "Radar sweep" pulse that fires along the selected satellite's orbit every
 * few seconds. A bright cyan line grows from the tail of the orbit ribbon
 * (oldest sampled position) toward the satellite's current head, arriving
 * with a glowing pop, then fades over the last half-second before starting
 * over. Meant to draw the eye toward the selected satellite the way a real
 * sonar sweep points at a contact.
 *
 * Uses the same ECI→current-ECEF trick as OrbitTrail so the arc lines up
 * exactly with the orbit ribbon.
 */

const CYCLE_MS = 3200; // full loop: grow → dwell → fade → wait
const GROW_END_MS = 1600; // pulse reaches the satellite head at this point
const FADE_END_MS = 2400; // fully invisible after this
const SAMPLE_COUNT = 90;
const SWEEP_COLOR = new Cesium.Color(0.55, 0.95, 1.0, 1.0);

export class SonarSweep {
  private collection: Cesium.PolylineCollection | null = null;
  private polyline: Cesium.Polyline | null = null;
  private material: Cesium.Material | null = null;
  private tickDispose: (() => void) | null = null;
  private satrec: satellite.SatRec | null = null;
  private periodMs = 0;
  private cyclePhaseMs = 0;
  private lastFrameMs: number | null = null;

  constructor(private readonly scene: Cesium.Scene) {
    this.collection = scene.primitives.add(new Cesium.PolylineCollection());
    this.tickDispose = scene.preRender.addEventListener(() => this.tick());
  }

  setFromTle(tle: Tle | null): void {
    this.hidePolyline();
    if (!tle) {
      this.satrec = null;
      return;
    }
    const sr = catalogObjectToSatRec(tle);
    if (!sr) {
      this.satrec = null;
      return;
    }
    this.satrec = sr;
    const meanMotionRevPerDay = (sr.no * 60 * 24) / (2 * Math.PI);
    if (meanMotionRevPerDay > 0) {
      this.periodMs = (1440 / meanMotionRevPerDay) * 60_000;
    } else {
      this.periodMs = 90 * 60_000;
    }
    this.cyclePhaseMs = 0; // start a fresh cycle on selection change
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
    if (this.collection) {
      try {
        this.scene.primitives.remove(this.collection);
      } catch {
        /* viewer torn down */
      }
      this.collection = null;
    }
    this.polyline = null;
    this.material = null;
    this.satrec = null;
  }

  private hidePolyline(): void {
    if (this.polyline) this.polyline.show = false;
  }

  private tick(): void {
    if (!this.satrec || !this.collection) return;
    const now = performance.now();
    if (this.lastFrameMs != null) {
      const dt = now - this.lastFrameMs;
      // Guard against long tab-hidden pauses producing huge dt.
      this.cyclePhaseMs = (this.cyclePhaseMs + Math.min(dt, 1000)) % CYCLE_MS;
    }
    this.lastFrameMs = now;

    const phase = this.cyclePhaseMs;
    if (phase > FADE_END_MS) {
      // Waiting period between pulses.
      this.hidePolyline();
      return;
    }

    // Compute alpha ramp.
    let alpha: number;
    let growFraction: number;
    if (phase <= GROW_END_MS) {
      growFraction = phase / GROW_END_MS;
      // Ease-out so it accelerates toward the satellite.
      growFraction = 1 - (1 - growFraction) * (1 - growFraction);
      alpha = 1.0;
    } else {
      growFraction = 1.0;
      alpha = 1.0 - (phase - GROW_END_MS) / (FADE_END_MS - GROW_END_MS);
    }

    // Sample points along the orbit from the tail (one full period back) to
    // wherever the growing head has reached. We rotate every ECI sample to
    // the *current* ECEF frame so the sweep sits exactly on the orbit
    // ribbon, which is drawn the same way.
    const nowDate = new Date();
    const gmst = satellite.gstime(nowDate);
    const cosG = Math.cos(gmst);
    const sinG = Math.sin(gmst);

    const tailOffsetMs = -this.periodMs;
    const headOffsetMs = tailOffsetMs + this.periodMs * growFraction;

    const samples: Cesium.Cartesian3[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const u = i / (SAMPLE_COUNT - 1);
      const relMs = tailOffsetMs + (headOffsetMs - tailOffsetMs) * u;
      const t = new Date(nowDate.getTime() + relMs);
      const pv = satellite.propagate(this.satrec, t);
      if (!pv || typeof pv.position === 'boolean') continue;
      const p = pv.position;
      samples.push(
        new Cesium.Cartesian3(
          (cosG * p.x + sinG * p.y) * 1000,
          (-sinG * p.x + cosG * p.y) * 1000,
          p.z * 1000,
        ),
      );
    }
    if (samples.length < 2) {
      this.hidePolyline();
      return;
    }

    if (!this.material) {
      this.material = Cesium.Material.fromType('PolylineGlow', {
        glowPower: 0.35,
        taperPower: 0.55,
        color: SWEEP_COLOR,
      });
    }
    (this.material.uniforms as { color: Cesium.Color }).color = new Cesium.Color(
      SWEEP_COLOR.red,
      SWEEP_COLOR.green,
      SWEEP_COLOR.blue,
      alpha,
    );

    if (!this.polyline) {
      this.polyline = this.collection.add({
        positions: samples,
        width: 3.0,
        material: this.material,
      });
    } else {
      this.polyline.positions = samples;
      this.polyline.show = true;
    }
  }
}
