import * as Cesium from 'cesium';
import type { PropagationSnapshot } from '@spacemap/shared';
import HeatmapWorker from '../workers/heatmap.worker.ts?worker';

const GRID_W = 360;
const GRID_H = 180;
const REBUILD_INTERVAL_MS = 4000;

/**
 * Toggleable satellite-density heatmap. Bins each satellite's geodetic
 * subpoint into a 1° × 1° cell, renders the grid to a canvas with a log
 * colour ramp, and swaps in a fresh imagery layer every few seconds.
 */
export class HeatmapLayer {
  private layer: Cesium.ImageryLayer | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private readonly worker: Worker;
  private nextRequestId = 1;
  private activeRequestId = 0;
  private lastRebuildMs = 0;
  private enabled = false;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = GRID_W;
    this.canvas.height = GRID_H;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.imageData = ctx.createImageData(GRID_W, GRID_H);
    this.worker = new HeatmapWorker();
    this.worker.onmessage = (ev) => {
      void this.handleWorkerMessage(ev.data);
    };
  }

  async setEnabled(v: boolean): Promise<void> {
    if (this.enabled === v) return;
    this.enabled = v;
    if (!v && this.layer) {
      this.viewer.imageryLayers.remove(this.layer);
      this.layer = null;
    }
  }

  async ingest(snap: PropagationSnapshot): Promise<void> {
    if (!this.enabled) return;
    if (snap.timeMs - this.lastRebuildMs < REBUILD_INTERVAL_MS) return;
    this.lastRebuildMs = snap.timeMs;
    const requestId = this.nextRequestId++;
    this.activeRequestId = requestId;
    const geodeticCopy = snap.geodetic.slice(0, snap.count * 3);
    this.worker.postMessage(
      {
        type: 'build',
        requestId,
        count: snap.count,
        geodetic: geodeticCopy.buffer,
      },
      [geodeticCopy.buffer],
    );
  }

  destroy(): void {
    this.worker.terminate();
    if (this.layer) {
      try {
        this.viewer.imageryLayers.remove(this.layer);
      } catch {
        /* viewer may already be destroyed */
      }
      this.layer = null;
    }
  }

  private async handleWorkerMessage(msg: unknown): Promise<void> {
    if (!msg || typeof msg !== 'object') return;
    const m = msg as { type?: string; requestId?: number; rgba?: ArrayBuffer };
    if (m.type !== 'built' || m.requestId !== this.activeRequestId || !m.rgba || !this.enabled) {
      return;
    }
    this.imageData.data.set(new Uint8ClampedArray(m.rgba));
    this.ctx.putImageData(this.imageData, 0, 0);

    const dataUrl = this.canvas.toDataURL('image/png');
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(dataUrl, {
      rectangle: Cesium.Rectangle.MAX_VALUE,
    });
    if (!this.enabled || m.requestId !== this.activeRequestId) return;
    const nextLayer = new Cesium.ImageryLayer(provider, { alpha: 0.55 });
    this.viewer.imageryLayers.add(nextLayer);
    if (this.layer) this.viewer.imageryLayers.remove(this.layer);
    this.layer = nextLayer;
  }
}
