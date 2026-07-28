import { useEffect, useRef } from "react";

/**
 * Animated hero globe - Canvas 2D with real Earth texture mapping.
 * Loads an equirectangular Earth map and renders it onto a rotating sphere
 * with ~1800 orbiting satellite particles.
 */

// ── math helpers ─────────────────────────────────────────
function rotX(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x, y: y * c - z * s, z: y * s + z * c };
}
function rotY(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

// ── satellite setup ──────────────────────────────────────
interface Sat {
  r: number; inc: number; raan: number; phase: number;
  spd: number; color: string; sz: number;
}

const PALETTE = [
  "#f23545","#f23545","#f23545",
  "#ff738d","#ff738d",
  "#ffb34d",
  "#ffffff","#ffffff",
  "#4dd8ff",
  "#33cc59",
  "#4d4dff",
];

function makeSats(n: number): Sat[] {
  const out: Sat[] = [];
  for (let i = 0; i < n; i++) {
    const b = Math.random();
    let r: number, inc: number;

    if (b < 0.70) {
      r = 1.06 + Math.random() * 0.32;
      inc = (25 + Math.random() * 75) * Math.PI / 180;
    } else if (b < 0.85) {
      r = 1.45 + Math.random() * 0.25;
      inc = (25 + Math.random() * 65) * Math.PI / 180;
    } else if (b < 0.95) {
      r = 1.78 + Math.random() * 0.06;
      inc = Math.random() * 12 * Math.PI / 180;
    } else {
      r = 1.15 + Math.random() * 0.70;
      inc = (30 + Math.random() * 60) * Math.PI / 180;
    }
    if (Math.random() > 0.5) inc = Math.PI - inc;

    out.push({
      r,
      inc,
      raan: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: (0.12 + Math.random() * 0.12) / Math.pow(r, 1.5),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      sz: 0.8 + Math.random() * 1.2,
    });
  }
  return out;
}

// ── component ────────────────────────────────────────────
export function HeroGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sats = makeSats(1800);
    let earthImg: HTMLImageElement | null = null;
    let earthData: ImageData | null = null;

    // Load Earth texture
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = (import.meta.env.BASE_URL || "/") + "brand/earth-map.jpg";
    img.onload = () => {
      // Draw to offscreen canvas to get pixel data
      const oc = document.createElement("canvas");
      oc.width = img.naturalWidth;
      oc.height = img.naturalHeight;
      const octx = oc.getContext("2d")!;
      octx.drawImage(img, 0, 0);
      earthData = octx.getImageData(0, 0, oc.width, oc.height);
      earthImg = img;
    };

    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    let raf = 0;
    const TILT = 0.35; // camera tilt (radians)

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() * 0.001;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.36; // globe screen radius

      const earthRot = t * 0.05; // slow rotation

      // ── Atmosphere glow ──────────────────────────────
      const glowR = R * 1.22;
      const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, glowR);
      glow.addColorStop(0, "rgba(77,150,232,0.18)");
      glow.addColorStop(0.6, "rgba(77,150,232,0.06)");
      glow.addColorStop(1, "rgba(77,150,232,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw behind-earth satellites first ───────────
      drawSatellites(ctx, sats, t, cx, cy, R, TILT, true);

      // ── Render Earth sphere ──────────────────────────
      if (earthData) {
        renderTexturedSphere(ctx, earthData, cx, cy, R, earthRot, TILT);
      } else {
        // Fallback solid sphere while texture loads
        const grad = ctx.createRadialGradient(
          cx - R * 0.2, cy - R * 0.2, R * 0.05,
          cx, cy, R
        );
        grad.addColorStop(0, "#1a4a6c");
        grad.addColorStop(0.7, "#0e2540");
        grad.addColorStop(1, "#06101a");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fresnel rim
      const rim = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R);
      rim.addColorStop(0, "rgba(77,150,232,0)");
      rim.addColorStop(0.7, "rgba(77,150,232,0)");
      rim.addColorStop(0.9, "rgba(77,150,232,0.2)");
      rim.addColorStop(1, "rgba(142,216,255,0.35)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw front satellites ────────────────────────
      drawSatellites(ctx, sats, t, cx, cy, R, TILT, false);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ── Texture-mapped sphere renderer ───────────────────────
// Renders the equirectangular Earth texture onto a sphere
// by iterating over screen pixels within the globe circle,
// computing the corresponding lat/lon, and sampling the texture.
function renderTexturedSphere(
  ctx: CanvasRenderingContext2D,
  tex: ImageData,
  cx: number, cy: number, R: number,
  rotAngle: number, tilt: number
) {
  const tw = tex.width;
  const th = tex.height;
  const td = tex.data;

  // We'll render at reduced resolution for performance, then draw scaled
  const step = 2; // render every 2nd pixel
  const imgW = Math.ceil(R * 2 / step);
  const imgH = Math.ceil(R * 2 / step);
  const offCanvas = document.createElement("canvas");
  offCanvas.width = imgW;
  offCanvas.height = imgH;
  const octx = offCanvas.getContext("2d")!;
  const outData = octx.createImageData(imgW, imgH);
  const out = outData.data;

  const R2 = R * R;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  // Light direction (from top-right)
  const lx = 0.6, ly = 0.4, lz = 0.7;
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
  const nlx = lx / lLen, nly = ly / lLen, nlz = lz / lLen;

  for (let py = 0; py < imgH; py++) {
    const sy = (py * step) - R; // screen y from center
    for (let px = 0; px < imgW; px++) {
      const sx = (px * step) - R; // screen x from center
      const d2 = sx * sx + sy * sy;
      if (d2 >= R2) continue;

      // Map screen pixel to point on unit sphere
      const nz = Math.sqrt(R2 - d2) / R; // z = sqrt(1 - x^2 - y^2)
      let nx = sx / R;
      let ny = -sy / R; // flip y

      // Undo camera tilt (rotate around X)
      const ny2 = ny * cosTilt + nz * sinTilt;
      const nz2 = -ny * sinTilt + nz * cosTilt;
      ny = ny2;
      const finalZ = nz2;

      // Compute lat/lon
      const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
      const lon = Math.atan2(nx, finalZ) - rotAngle;

      // Sample texture
      let u = ((lon / Math.PI + 1) / 2) % 1;
      if (u < 0) u += 1;
      const v = 0.5 - lat / Math.PI;

      const tx = Math.floor(u * (tw - 1));
      const ty = Math.floor(v * (th - 1));
      const ti = (ty * tw + tx) * 4;

      // Lambertian lighting
      const dot = Math.max(0, nx * nlx + ny * nly + nz * nlz);
      const ambient = 0.25;
      const light = ambient + (1 - ambient) * dot;

      const idx = (py * imgW + px) * 4;
      out[idx]     = Math.min(255, td[ti] * light);
      out[idx + 1] = Math.min(255, td[ti + 1] * light);
      out[idx + 2] = Math.min(255, td[ti + 2] * light);
      out[idx + 3] = 255;
    }
  }

  octx.putImageData(outData, 0, 0);

  // Draw the sphere onto the main canvas, scaled up
  ctx.drawImage(offCanvas, cx - R, cy - R, R * 2, R * 2);
}

// ── Satellite renderer ───────────────────────────────────
function drawSatellites(
  ctx: CanvasRenderingContext2D,
  sats: Sat[],
  t: number,
  cx: number, cy: number, R: number,
  tilt: number,
  behindOnly: boolean
) {
  const fov = 3.6;

  for (const sat of sats) {
    const angle = sat.phase + t * sat.spd;

    let px = sat.r * Math.cos(angle);
    let py = 0;
    let pz = sat.r * Math.sin(angle);

    // Inclination
    const r1 = rotX(px, py, pz, sat.inc);
    px = r1.x; py = r1.y; pz = r1.z;

    // RAAN
    const r2 = rotY(px, py, pz, sat.raan);
    px = r2.x; py = r2.y; pz = r2.z;

    // Camera tilt
    const r3 = rotX(px, py, pz, tilt);
    px = r3.x; py = r3.y; pz = r3.z;

    // Is it behind the Earth?
    const distXY = Math.sqrt(px * px + py * py);
    const behind = pz < 0 && distXY < 0.98;

    if (behindOnly !== behind) continue;

    // Project
    const d = fov / (fov + pz);
    const sx = cx + px * R * d;
    const sy = cy - py * R * d;
    const sz = sat.sz * d;

    if (behind) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = sat.color;
      ctx.beginPath();
      ctx.arc(sx, sy, sz * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Soft glow
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = sat.color;
      ctx.beginPath();
      ctx.arc(sx, sy, sz * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
