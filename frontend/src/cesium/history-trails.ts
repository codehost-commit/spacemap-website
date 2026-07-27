import * as Cesium from "cesium";
import {
  ORBIT_CLASSES,
  ORBIT_CLASS_COLOR,
  type OrbitClass,
  type PropagationSnapshot,
} from "@spacemap/shared";

const MAX_SATS = 1200;         // hard cap so trails don't ruin FPS at 30k
const RING_SIZE = 40;          // samples per trail
const SAMPLE_INTERVAL_MS = 1200; // wall-time between new samples

interface Buffer {
  positions: Float64Array; // xyz * RING_SIZE (ECEF metres)
  count: number;
  head: number;
  polyline: Cesium.Polyline | null;
  cls: number;
  dirty: boolean; // needs polyline positions re-materialized
}

/**
 * Fading orbit trails behind visible satellites. Each satellite gets its
 * own ring buffer of ECEF positions plus its own PolylineGlow material —
 * PolylineCollection blows up if you share Material instances or add
 * polylines with empty positions.
 */
export class HistoryTrails {
  private readonly polylines: Cesium.PolylineCollection;
  private readonly buffers = new Map<number, Buffer>();
  private readonly colors: Cesium.Color[];
  private lastSampleMs = 0;
  private enabled = false;

  constructor(scene: Cesium.Scene) {
    this.polylines = scene.primitives.add(new Cesium.PolylineCollection());
    this.colors = ORBIT_CLASSES.map((cls) => {
      const c = Cesium.Color.fromCssColorString(ORBIT_CLASS_COLOR[cls]);
      c.alpha = 0.85;
      return c;
    });
  }

  setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    if (!v) this.clear();
  }

  ingest(
    snap: PropagationSnapshot,
    filter: Set<OrbitClass>,
    options: { force?: boolean } = {},
  ): void {
    if (!this.enabled) return;

    const dueForSample = snap.timeMs - this.lastSampleMs >= SAMPLE_INTERVAL_MS;
    if (!dueForSample && !options.force) return;
    if (dueForSample) this.lastSampleMs = snap.timeMs;

    const filterMask = new Uint8Array(ORBIT_CLASSES.length);
    for (let i = 0; i < ORBIT_CLASSES.length; i++) {
      filterMask[i] = filter.has(ORBIT_CLASSES[i]) ? 1 : 0;
    }

    const { count, ids, ecefPos, orbitClass } = snap;
    const seen = new Set<number>();

    for (let n = 0; n < count; n++) {
      const cls = orbitClass[n];
      if (!filterMask[cls]) continue;
      const id = ids[n];

      let buf = this.buffers.get(id);
      if (!buf) {
        if (this.buffers.size >= MAX_SATS) continue;
        buf = {
          positions: new Float64Array(RING_SIZE * 3),
          count: 0,
          head: 0,
          polyline: null,
          cls,
          dirty: false,
        };
        this.buffers.set(id, buf);
      }
      seen.add(id);

      if (dueForSample) {
        const base = buf.head * 3;
        buf.positions[base] = ecefPos[n * 3];
        buf.positions[base + 1] = ecefPos[n * 3 + 1];
        buf.positions[base + 2] = ecefPos[n * 3 + 2];
        buf.head = (buf.head + 1) % RING_SIZE;
        if (buf.count < RING_SIZE) buf.count++;
        buf.dirty = true;
      }

      if (buf.dirty && buf.count >= 2) {
        const pts: Cesium.Cartesian3[] = new Array(buf.count);
        const start = (buf.head - buf.count + RING_SIZE) % RING_SIZE;
        for (let k = 0; k < buf.count; k++) {
          const idx = (start + k) % RING_SIZE;
          pts[k] = new Cesium.Cartesian3(
            buf.positions[idx * 3],
            buf.positions[idx * 3 + 1],
            buf.positions[idx * 3 + 2],
          );
        }
        if (!buf.polyline) {
          // Fresh material per polyline — sharing Material across polylines
          // in PolylineCollection triggers "undefined.type" during update.
          const material = Cesium.Material.fromType("PolylineGlow", {
            glowPower: 0.2,
            taperPower: 0.35,
            color: this.colors[cls],
          });
          buf.polyline = this.polylines.add({
            positions: pts,
            width: 1.4,
            material,
          });
        } else {
          buf.polyline.positions = pts;
        }
        buf.dirty = false;
      }
    }

    // Reap trails that dropped out.
    for (const [id, buf] of this.buffers) {
      if (seen.has(id)) continue;
      if (buf.polyline) this.polylines.remove(buf.polyline);
      this.buffers.delete(id);
    }
  }

  clear(): void {
    this.polylines.removeAll();
    this.buffers.clear();
    this.lastSampleMs = 0;
  }
}
