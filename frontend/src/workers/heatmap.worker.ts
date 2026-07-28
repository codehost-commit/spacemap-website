/// <reference lib="webworker" />

const GRID_W = 360;
const GRID_H = 180;

interface HeatmapBuildMsg {
  type: 'build';
  requestId: number;
  count: number;
  geodetic: ArrayBuffer;
}

self.onmessage = (ev: MessageEvent<HeatmapBuildMsg>) => {
  const msg = ev.data;
  if (msg.type !== 'build') return;

  const geodetic = new Float32Array(msg.geodetic);
  const counts = new Uint32Array(GRID_W * GRID_H);
  for (let n = 0; n < msg.count; n++) {
    const lat = geodetic[n * 3];
    const lon = geodetic[n * 3 + 1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const gx = Math.min(GRID_W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * GRID_W)));
    const gy = Math.min(GRID_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * GRID_H)));
    counts[gy * GRID_W + gx]++;
  }

  let maxCount = 1;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) maxCount = counts[i];
  }
  const logMax = Math.log1p(maxCount);
  const rgba = new Uint8ClampedArray(counts.length * 4);
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    const t = c === 0 ? 0 : Math.log1p(c) / logMax;
    const { r, g, b, a } = ramp(t);
    const px = i * 4;
    rgba[px] = r;
    rgba[px + 1] = g;
    rgba[px + 2] = b;
    rgba[px + 3] = a;
  }

  (self as unknown as Worker).postMessage(
    {
      type: 'built',
      requestId: msg.requestId,
      rgba: rgba.buffer,
    },
    [rgba.buffer],
  );
};

function ramp(t: number): { r: number; g: number; b: number; a: number } {
  if (t <= 0) return { r: 0, g: 0, b: 0, a: 0 };
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
