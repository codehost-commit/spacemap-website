import * as Cesium from "cesium";
import type { PropagationSnapshot } from "@spacemap/shared";

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
  private lastRebuildMs = 0;
  private enabled = false;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = GRID_W;
    this.canvas.height = GRID_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.imageData = ctx.createImageData(GRID_W, GRID_H);
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

    const counts = new Uint32Array(GRID_W * GRID_H);
    const { count, geodetic } = snap;
    for (let n = 0; n < count; n++) {
      const lat = geodetic[n * 3];
      const lon = geodetic[n * 3 + 1];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      // lon [-180,180] → [0, GRID_W-1], lat [-90,90] → [0, GRID_H-1] (flipped for image space).
      const gx = Math.min(GRID_W - 1, Math.max(0, Math.floor((lon + 180) / 360 * GRID_W)));
      const gy = Math.min(GRID_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * GRID_H)));
      counts[gy * GRID_W + gx]++;
    }

    let maxCount = 1;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > maxCount) maxCount = counts[i];
    }
    const logMax = Math.log1p(maxCount);

    const data = this.imageData.data;
    for (let i = 0; i < counts.length; i++) {
      const c = counts[i];
      const t = c === 0 ? 0 : Math.log1p(c) / logMax;
      const { r, g, b, a } = ramp(t);
      const px = i * 4;
      data[px] = r;
      data[px + 1] = g;
      data[px + 2] = b;
      data[px + 3] = a;
    }
    this.ctx.putImageData(this.imageData, 0, 0);

    // Swap imagery layers rather than mutating in place — this is the reliable
    // way to force Cesium to re-upload the texture.
    const dataUrl = this.canvas.toDataURL("image/png");
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(dataUrl, {
      rectangle: Cesium.Rectangle.MAX_VALUE,
    });
    const nextLayer = new Cesium.ImageryLayer(provider, { alpha: 0.55 });
    this.viewer.imageryLayers.add(nextLayer);
    if (this.layer) this.viewer.imageryLayers.remove(this.layer);
    this.layer = nextLayer;
  }

  destroy(): void {
    if (this.layer) {
      try {
        this.viewer.imageryLayers.remove(this.layer);
      } catch {
        /* viewer may already be destroyed */
      }
      this.layer = null;
    }
  }
}

/** Cool→hot colour ramp: transparent → cyan → yellow → red. */
function ramp(t: number): { r: number; g: number; b: number; a: number } {
  if (t <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  // Piecewise linear stops.
  const stops = [
    { t: 0.0, r: 30, g: 80, b: 160, a: 0 },
    { t: 0.1, r: 30, g: 200, b: 220, a: 90 },
    { t: 0.4, r: 240, g: 220, b: 80, a: 170 },
    { t: 1.0, r: 255, g: 60, b: 60, a: 220 },
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const u = (t - a.t) / (b.t - a.t);
      return {
        r: Math.round(a.r + (b.r - a.r) * u),
        g: Math.round(a.g + (b.g - a.g) * u),
        b: Math.round(a.b + (b.b - a.b) * u),
        a: Math.round(a.a + (b.a - a.a) * u),
      };
    }
  }
  const last = stops[stops.length - 1];
  return { r: last.r, g: last.g, b: last.b, a: last.a };
}
