import * as Cesium from 'cesium';
import type { ConjunctionResult, PropagationSnapshot, Tle } from '@spacemap/shared';
import PropagatorWorker from '../workers/propagator.worker.ts?worker';
import { loadCatalogProgressively } from './tle-catalog.js';
import { setLocalCatalog } from './catalog-store.js';
import { useStore } from '../state/store.js';

export class Simulation {
  private worker: Worker;
  private inflight = false;
  private queued = false;
  private timerScheduled = false;
  private lastRequestMs = 0;
  private readonly minIntervalMs = 180;
  private disposers: Array<() => void> = [];
  private nextRequestId = 1;
  private conjunctionWaiters = new Map<number, (result: ConjunctionResult | Error) => void>();
  private nextPingNonce = 1;
  private pingWaiters = new Map<number, (rtt: number) => void>();

  constructor(private readonly viewer: Cesium.Viewer) {
    this.worker = new PropagatorWorker();
    this.worker.onmessage = (ev) => this.handleWorkerMessage(ev.data);
  }

  async load(): Promise<void> {
    const store = useStore.getState();
    store.setCatalogStatus('loading');
    try {
      let coreReady = false;
      await loadCatalogProgressively({
        onChunk: async ({ objects, mode, loadedCount, totalCount, hydrating }) => {
          this.worker.postMessage({ type: 'load', tles: objects, mode });
          setLocalCatalog(objects, mode);
          const indexEntries = objects.map((t: Tle) => ({
            noradId: t.noradId,
            name: t.name,
            objectType: t.objectType ?? 'unknown',
            owner: t.owner,
            sourcePriority: t.sourcePriority,
          }));
          if (mode === 'replace') store.setIndex(indexEntries);
          else store.appendIndex(indexEntries);
          store.setCatalogProgress(loadedCount, totalCount, hydrating);
          if (!coreReady) {
            coreReady = true;
            store.setCatalogStatus('ready');
            // Fire an immediate propagation now that the worker has data — don't
            // wait for the next Cesium tick.
            this.requestPropagation(Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime());
          }
        },
      });
    } catch (err) {
      store.setCatalogStatus('error', err instanceof Error ? err.message : String(err));
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

  /** Round-trip ping to the propagator worker. Used by the diagnose runner. */
  ping(): Promise<{ rttMs: number; catalogSize: number }> {
    const nonce = this.nextPingNonce++;
    const start = performance.now();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pingWaiters.delete(nonce);
        reject(new Error('worker ping timed out'));
      }, 5000);
      // The handler stores the reply's catalog size on this closure so we
      // can pass it out with the RTT.
      this.pingCatalogTemp = 0;
      this.pingWaiters.set(nonce, (endMs) => {
        clearTimeout(timeout);
        resolve({ rttMs: endMs - start, catalogSize: this.pingCatalogTemp });
      });
      this.worker.postMessage({ type: 'ping', nonce });
    });
  }
  private pingCatalogTemp = 0;

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
        type: 'conjunction',
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
      this.scheduleQueuedPropagation(Math.max(0, this.minIntervalMs - (now - this.lastRequestMs)));
      return;
    }
    this.inflight = true;
    this.lastRequestMs = now;
    this.queued = false;
    this.worker.postMessage({ type: 'propagate', timeMs });
  }

  private scheduleQueuedPropagation(delayMs: number): void {
    if (this.timerScheduled) return;
    this.timerScheduled = true;
    setTimeout(() => {
      this.timerScheduled = false;
      if (!this.queued || this.inflight) return;
      this.queued = false;
      this.requestPropagation(Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime());
    }, delayMs);
  }

  private handleWorkerMessage(msg: unknown): void {
    if (!msg || typeof msg !== 'object') return;
    const m = msg as { type: string };

    if (m.type === 'snapshot') {
      const s = msg as {
        type: 'snapshot';
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
        this.scheduleQueuedPropagation(this.minIntervalMs);
      }
      return;
    }

    if (m.type === 'pong') {
      const r = msg as { type: 'pong'; nonce: number; catalogSize: number };
      const cb = this.pingWaiters.get(r.nonce);
      if (cb) {
        this.pingWaiters.delete(r.nonce);
        this.pingCatalogTemp = r.catalogSize;
        cb(performance.now());
      }
      return;
    }

    if (m.type === 'conjunctionResult') {
      const r = msg as {
        type: 'conjunctionResult';
        requestId: number;
        result?: ConjunctionResult;
        error?: string;
      };
      const cb = this.conjunctionWaiters.get(r.requestId);
      if (!cb) return;
      this.conjunctionWaiters.delete(r.requestId);
      cb(r.result ?? new Error(r.error ?? 'conjunction failed'));
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
