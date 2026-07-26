import * as Cesium from "cesium";
import type { ConjunctionResult, PropagationSnapshot, Tle } from "@spacemap/shared";
import PropagatorWorker from "../workers/propagator.worker.ts?worker";
import { fetchTles } from "./tle-catalog.js";
import { useStore } from "../state/store.js";

export class Simulation {
  private worker: Worker;
  private inflight = false;
  private queued = false;
  private lastRequestMs = 0;
  private readonly minIntervalMs = 60;
  private disposers: Array<() => void> = [];
  private nextRequestId = 1;
  private conjunctionWaiters = new Map<
    number,
    (result: ConjunctionResult | Error) => void
  >();

  constructor(private readonly viewer: Cesium.Viewer) {
    this.worker = new PropagatorWorker();
    this.worker.onmessage = (ev) => this.handleWorkerMessage(ev.data);
  }

  async load(): Promise<void> {
    const store = useStore.getState();
    store.setCatalogStatus("loading");
    try {
      const tles = await fetchTles();
      this.worker.postMessage({ type: "load", tles });
      store.setIndex(tles.map((t: Tle) => ({ noradId: t.noradId, name: t.name })));
      store.setCatalogStatus("ready");
      // Fire an immediate propagation now that the worker has data — don't
      // wait for the next Cesium tick.
      this.requestPropagation(
        Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime(),
      );
    } catch (err) {
      store.setCatalogStatus("error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  start(): void {
    const clock = this.viewer.clock;
    clock.shouldAnimate = true;
    clock.multiplier = 1;
    clock.clockRange = Cesium.ClockRange.UNBOUNDED;
    clock.currentTime = Cesium.JulianDate.fromDate(new Date());

    const onTick = clock.onTick.addEventListener((c) => {
      const timeMs = Cesium.JulianDate.toDate(c.currentTime).getTime();
      useStore.getState().setClock(timeMs, c.multiplier, !c.shouldAnimate);
      this.requestPropagation(timeMs);
    });
    this.disposers.push(onTick);
  }

  destroy(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.worker.terminate();
    this.conjunctionWaiters.clear();
  }

  /** Run a conjunction search between two satellites in the worker. */
  runConjunction(
    aId: number,
    bId: number,
    opts: { hours?: number; coarseStepSec?: number } = {},
  ): Promise<ConjunctionResult> {
    const hours = opts.hours ?? 24;
    const coarseStepSec = opts.coarseStepSec ?? 60;
    const now = Date.now();
    const requestId = this.nextRequestId++;
    return new Promise<ConjunctionResult>((resolve, reject) => {
      this.conjunctionWaiters.set(requestId, (r) => {
        if (r instanceof Error) reject(r);
        else resolve(r);
      });
      this.worker.postMessage({
        type: "conjunction",
        requestId,
        aId,
        bId,
        startMs: now,
        endMs: now + hours * 3_600_000,
        coarseStepSec,
      });
    });
  }

  private requestPropagation(timeMs: number): void {
    const now = performance.now();
    if (this.inflight) {
      this.queued = true;
      return;
    }
    if (now - this.lastRequestMs < this.minIntervalMs) {
      this.queued = true;
      setTimeout(
        () => {
          if (this.queued) {
            this.queued = false;
            this.requestPropagation(
              Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime(),
            );
          }
        },
        Math.max(0, this.minIntervalMs - (now - this.lastRequestMs)),
      );
      return;
    }
    this.inflight = true;
    this.lastRequestMs = now;
    this.queued = false;
    this.worker.postMessage({ type: "propagate", timeMs });
  }

  private handleWorkerMessage(msg: unknown): void {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { type: string };

    if (m.type === "snapshot") {
      const s = msg as {
        type: "snapshot";
        timeMs: number;
        count: number;
        ids: ArrayBuffer;
        eciPos: ArrayBuffer;
        ecefPos: ArrayBuffer;
        ecefVel: ArrayBuffer;
        geodetic: ArrayBuffer;
        speed: ArrayBuffer;
        orbitClass: ArrayBuffer;
      };
      const snap: PropagationSnapshot = {
        timeMs: s.timeMs,
        count: s.count,
        ids: new Int32Array(s.ids, 0, s.count),
        eciPos: new Float32Array(s.eciPos, 0, s.count * 3),
        ecefPos: new Float32Array(s.ecefPos, 0, s.count * 3),
        ecefVel: new Float32Array(s.ecefVel, 0, s.count * 3),
        geodetic: new Float32Array(s.geodetic, 0, s.count * 3),
        speed: new Float32Array(s.speed, 0, s.count),
        orbitClass: new Uint8Array(s.orbitClass, 0, s.count),
      };
      useStore.getState().setSnapshot(snap);
      this.inflight = false;
      if (this.queued) {
        this.queued = false;
        this.requestPropagation(
          Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime(),
        );
      }
      return;
    }

    if (m.type === "conjunctionResult") {
      const r = msg as {
        type: "conjunctionResult";
        requestId: number;
        result?: ConjunctionResult;
        error?: string;
      };
      const cb = this.conjunctionWaiters.get(r.requestId);
      if (!cb) return;
      this.conjunctionWaiters.delete(r.requestId);
      cb(r.result ?? new Error(r.error ?? "conjunction failed"));
      return;
    }
  }
}

let installedSim: Simulation | null = null;
export function installSimulation(sim: Simulation): () => void {
  installedSim = sim;
  return () => {
    if (installedSim === sim) installedSim = null;
  };
}
export function getSimulation(): Simulation | null {
  return installedSim;
}
