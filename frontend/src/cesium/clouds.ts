import * as Cesium from 'cesium';

/**
 * Procedural cloud overlay.
 *
 * Real-time satellite cloud data (MODIS, VIIRS) is polar-orbit swath data —
 * fundamentally has ground-track gaps and only covers the sunlit hemisphere.
 * Real-time composited cloud tiles (OpenWeatherMap) require an API key.
 *
 * Instead we generate a photorealistic global cloud texture on a canvas using
 * fractal value noise, then wrap the whole globe with it as a single tile.
 * Guaranteed gap-free, covers day + night, looks like actual clouds, and
 * re-rolls a new cloud pattern each session so it feels alive.
 *
 * Alpha fades with camera altitude so the user "descends through" the deck:
 *   • Above ~8,000 km → full opacity
 *   • Below ~800 km   → fully transparent
 */

const MAX_ALPHA = 0.85;
const FADE_HIGH_M = 8_000_000;
const FADE_LOW_M = 800_000;
const UPDATE_INTERVAL_MS = 200;

const TEXTURE_W = 2048;
const TEXTURE_H = 1024;

// ── Value noise (deterministic, fast, no external deps) ─────────────────────

function makeNoise(seed: number) {
  const permutation = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  // Fisher-Yates shuffle seeded by `seed`
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) permutation[i] = perm[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const A = permutation[X] + Y;
    const B = permutation[X + 1] + Y;
    return lerp(
      lerp(grad(permutation[A], xf, yf), grad(permutation[B], xf - 1, yf), u),
      lerp(grad(permutation[A + 1], xf, yf - 1), grad(permutation[B + 1], xf - 1, yf - 1), u),
      v,
    );
  };
}

function fractalNoise(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let sum = 0;
  for (let o = 0; o < octaves; o++) {
    value += noise(x * freq, y * freq) * amp;
    sum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / sum;
}

// ── Cloud texture generation ────────────────────────────────────────────────

function generateCloudTextureUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const seed = Math.floor(Math.random() * 1_000_000);
  const noise = makeNoise(seed);
  const imgData = ctx.createImageData(TEXTURE_W, TEXTURE_H);
  const data = imgData.data;

  // Base scale — 8 cycles across the equator gives ~continent-sized cloud bands
  const scale = 6;

  for (let y = 0; y < TEXTURE_H; y++) {
    const ny = y / TEXTURE_H;
    // Latitude weighting — no clouds at poles, more in mid-latitudes and ITCZ
    const lat = (ny - 0.5) * Math.PI;
    // Bias toward equator + mid-latitudes, thin at poles
    const latWeight =
      0.55 +
      0.35 * Math.cos(lat * 2) + // ITCZ + mid-latitude bands
      0.15 * Math.cos(lat * 6); // sub-tropical minima

    for (let x = 0; x < TEXTURE_W; x++) {
      const nx = x / TEXTURE_W;
      // Wrap x so left/right edges match seamlessly
      const angle = nx * Math.PI * 2;
      const wx = Math.cos(angle) * scale;
      const wy = Math.sin(angle) * scale;

      // Two noise fields: base pattern + finer detail
      const base = (fractalNoise(noise, wx, ny * scale, 5) + 1) / 2;
      const detail = (fractalNoise(noise, wx * 3, ny * scale * 3, 4) + 1) / 2;
      const combined = base * 0.7 + detail * 0.3;

      // Threshold + soft transition — creates cloud-vs-clear separation
      let cloud = (combined * latWeight - 0.35) * 2.2;
      cloud = Math.max(0, Math.min(1, cloud));

      // Slightly bluish-white for realism
      const idx = (y * TEXTURE_W + x) * 4;
      const alpha = Math.round(cloud * 255);
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ── Cesium overlay ──────────────────────────────────────────────────────────

export class CloudOverlay {
  private layer: Cesium.ImageryLayer | null = null;
  private readonly viewer: Cesium.Viewer;
  private enabled = false;
  private preRenderDispose: (() => void) | null = null;
  private lastCheckMs = 0;
  private cachedTextureUrl: string | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.addLayer();
    } else {
      this.removeLayer();
    }
  }

  private async addLayer(): Promise<void> {
    if (this.layer) return;

    // Generate once per session so navigating away and back keeps the same clouds
    if (!this.cachedTextureUrl) {
      this.cachedTextureUrl = generateCloudTextureUrl();
    }
    if (!this.cachedTextureUrl) return;

    try {
      const provider = await Cesium.SingleTileImageryProvider.fromUrl(this.cachedTextureUrl, {
        rectangle: Cesium.Rectangle.MAX_VALUE,
        credit: new Cesium.Credit('Procedural clouds', true),
      });
      this.layer = new Cesium.ImageryLayer(provider, {
        alpha: MAX_ALPHA,
      });
      this.viewer.imageryLayers.add(this.layer);
    } catch (err) {
      console.warn('[clouds] failed to add layer', err);
      return;
    }

    this.preRenderDispose = this.viewer.scene.preRender.addEventListener(() => {
      this.updateAlpha();
    });
  }

  private removeLayer(): void {
    if (this.preRenderDispose) {
      this.preRenderDispose();
      this.preRenderDispose = null;
    }
    if (this.layer) {
      try {
        this.viewer.imageryLayers.remove(this.layer);
      } catch {
        /* viewer may be torn down */
      }
      this.layer = null;
    }
  }

  private updateAlpha(): void {
    if (!this.layer) return;
    const now = performance.now();
    if (now - this.lastCheckMs < UPDATE_INTERVAL_MS) return;
    this.lastCheckMs = now;

    const altM = this.viewer.camera.positionCartographic.height;

    let t: number;
    if (altM >= FADE_HIGH_M) {
      t = 1;
    } else if (altM <= FADE_LOW_M) {
      t = 0;
    } else {
      const linear = (altM - FADE_LOW_M) / (FADE_HIGH_M - FADE_LOW_M);
      t = linear * linear * (3 - 2 * linear);
    }

    this.layer.alpha = t * MAX_ALPHA;
  }

  destroy(): void {
    this.removeLayer();
  }
}
