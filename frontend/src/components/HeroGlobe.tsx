import { useEffect, useRef } from "react";

/**
 * Animated hero globe v5 - polished Canvas 2D renderer.
 * - Vibrant textured Earth with city lights & atmosphere
 * - ~2000 sharp satellite dots, concentrated in a dense LEO shell
 * - Featured spacecraft (ISS, Hubble, JWST, Voyager) with labels
 * - Short fading trails, depth-sorted, starfield backdrop
 */

// ── math ─────────────────────────────────────────────────
function rotX(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x, y: y * c - z * s, z: y * s + z * c };
}
function rotY(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

// ── types ────────────────────────────────────────────────
interface Sat {
  r: number; inc: number; raan: number; phase: number;
  spd: number; color: string; sz: number;
}
interface FeaturedSat extends Sat {
  label: string;
  type: string;
}

// ── palette ──────────────────────────────────────────────
const PAL = [
  "#ff3040","#ff3040","#ff3040","#ff3040",  // red (dominant like real tracker)
  "#ff6080","#ff6080","#ff6080",             // pink
  "#ffaa33",                                  // orange
  "#ffffff","#ffffff","#ffffff",              // white
  "#55ddff",                                  // cyan
  "#44dd66",                                  // green
];

function makeSats(n: number): Sat[] {
  const out: Sat[] = [];
  for (let i = 0; i < n; i++) {
    const b = Math.random();
    let r: number, inc: number;
    // Heavy LEO concentration (like real tracker's dense ring)
    if (b < 0.75) { r = 1.05 + Math.random() * 0.30; inc = (25 + Math.random() * 75) * Math.PI / 180; }
    else if (b < 0.88) { r = 1.40 + Math.random() * 0.25; inc = (25 + Math.random() * 65) * Math.PI / 180; }
    else if (b < 0.96) { r = 1.72 + Math.random() * 0.06; inc = Math.random() * 10 * Math.PI / 180; }
    else { r = 1.15 + Math.random() * 0.65; inc = (30 + Math.random() * 60) * Math.PI / 180; }
    if (Math.random() > 0.5) inc = Math.PI - inc;
    out.push({
      r, inc,
      raan: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: (0.10 + Math.random() * 0.10) / Math.pow(r, 1.5),
      color: PAL[Math.floor(Math.random() * PAL.length)],
      sz: 0.5 + Math.random() * 0.7,
    });
  }
  return out;
}

function makeFeatured(): FeaturedSat[] {
  return [
    { label: "ISS", type: "iss", r: 1.08, inc: 51.6 * Math.PI / 180, raan: 0.3, phase: 0, spd: 0.20, color: "#ffffff", sz: 3.0 },
    { label: "Hubble", type: "hubble", r: 1.11, inc: 28.5 * Math.PI / 180, raan: 2.1, phase: Math.PI * 0.6, spd: 0.19, color: "#55ddff", sz: 2.5 },
    { label: "JWST", type: "jwst", r: 1.58, inc: 5 * Math.PI / 180, raan: 4.0, phase: Math.PI * 1.2, spd: 0.06, color: "#ffaa33", sz: 2.8 },
    { label: "Voyager", type: "voyager", r: 1.82, inc: 35 * Math.PI / 180, raan: 5.5, phase: Math.PI * 0.3, spd: 0.03, color: "#44dd66", sz: 2.2 },
  ];
}

// ── starfield (static) ───────────────────────────────────
function makeStars(n: number): { x: number; y: number; br: number }[] {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      br: 0.2 + Math.random() * 0.6,
    });
  }
  return stars;
}

// ── component ────────────────────────────────────────────
export function HeroGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sats = makeSats(2000);
    const featured = makeFeatured();
    const stars = makeStars(200);
    let earthData: ImageData | null = null;

    // Offscreen canvas for sphere (reused each frame)
    let sphereCanvas: HTMLCanvasElement | null = null;
    let sphereCtx: CanvasRenderingContext2D | null = null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = (import.meta.env.BASE_URL || "/") + "brand/earth-map.jpg";
    img.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = img.naturalWidth;
      oc.height = img.naturalHeight;
      const octx = oc.getContext("2d")!;
      octx.drawImage(img, 0, 0);
      earthData = octx.getImageData(0, 0, oc.width, oc.height);
    };

    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = rect.width; h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Reset sphere canvas on resize
      sphereCanvas = null;
      sphereCtx = null;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    let raf = 0;
    const TILT = 0.32;
    const FOV = 3.6;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() * 0.001;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.38;
      const earthRot = t * 0.04;

      // ── Starfield ──────────────────────────────────
      for (const star of stars) {
        const twinkle = 0.7 + 0.3 * Math.sin(t * 2 + star.x * 100);
        ctx.globalAlpha = star.br * twinkle;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Atmosphere glow (larger, softer) ───────────
      const grad1 = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.35);
      grad1.addColorStop(0, "rgba(60,140,230,0.20)");
      grad1.addColorStop(0.4, "rgba(60,140,230,0.08)");
      grad1.addColorStop(1, "rgba(60,140,230,0)");
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // ── Satellite position helper ──────────────────
      const satPos = (s: Sat, time: number) => {
        const angle = s.phase + time * s.spd;
        let px = s.r * Math.cos(angle), py = 0, pz = s.r * Math.sin(angle);
        let r1 = rotX(px, py, pz, s.inc); px = r1.x; py = r1.y; pz = r1.z;
        let r2 = rotY(px, py, pz, s.raan); px = r2.x; py = r2.y; pz = r2.z;
        let r3 = rotX(px, py, pz, TILT); px = r3.x; py = r3.y; pz = r3.z;
        const dist = Math.sqrt(px * px + py * py);
        const behind = pz < 0 && dist < 0.97;
        const d = FOV / (FOV + pz);
        return { sx: cx + px * R * d, sy: cy - py * R * d, depth: pz, behind, d };
      };

      // ── Behind-earth satellites ────────────────────
      for (const s of sats) {
        const p = satPos(s, t);
        if (!p.behind) continue;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, s.sz * p.d * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Earth sphere ───────────────────────────────
      if (earthData) {
        renderSphere(ctx, earthData, cx, cy, R, earthRot, TILT, sphereCanvas, sphereCtx,
          (sc, sctx) => { sphereCanvas = sc; sphereCtx = sctx; });
      } else {
        const grad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.05, cx, cy, R);
        grad.addColorStop(0, "#1a4a6c");
        grad.addColorStop(0.7, "#0e2540");
        grad.addColorStop(1, "#06101a");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fresnel rim (brighter, more visible)
      const rim = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.02);
      rim.addColorStop(0, "rgba(80,160,240,0)");
      rim.addColorStop(0.6, "rgba(80,160,240,0)");
      rim.addColorStop(0.85, "rgba(100,180,255,0.25)");
      rim.addColorStop(1, "rgba(142,216,255,0.45)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // ── Front satellites ───────────────────────────
      // Draw in depth order (roughly - skip full sort for perf)
      for (const s of sats) {
        const p = satPos(s, t);
        if (p.behind) continue;

        const sz = s.sz * p.d;

        // Short trail (2 segments, very subtle)
        const p1 = satPos(s, t - 0.06);
        const p2 = satPos(s, t - 0.12);
        if (!p1.behind && !p2.behind) {
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = sz * 0.5;
          ctx.globalAlpha = 0.15;
          ctx.stroke();
        }

        // Dot with bright core
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
        ctx.fill();

        // Hot center
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, sz * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Featured spacecraft ────────────────────────
      for (const f of featured) {
        const p = satPos(f, t);
        if (p.behind) continue;

        const sz = f.sz * p.d;

        // Longer trail for featured
        ctx.beginPath();
        ctx.moveTo(p.sx, p.sy);
        for (let i = 1; i <= 6; i++) {
          const tp = satPos(f, t - i * 0.08);
          if (tp.behind) break;
          ctx.lineTo(tp.sx, tp.sy);
        }
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.35;
        ctx.stroke();

        // Spacecraft icon
        drawSpacecraft(ctx, p.sx, p.sy, sz, f.color, f.type);

        // Label with background pill
        const fontSize = Math.max(9, sz * 2.5);
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const labelY = p.sy - sz * 4.5;
        const labelW = ctx.measureText(f.label).width + 8;

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#06101a";
        ctx.beginPath();
        ctx.roundRect(p.sx - labelW / 2, labelY - fontSize * 0.7, labelW, fontSize * 1.2, 3);
        ctx.fill();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = f.color;
        ctx.fillText(f.label, p.sx, labelY);
      }

      ctx.globalAlpha = 1;
    };

    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ── Spacecraft silhouettes (cleaner, with glow) ──────────
function drawSpacecraft(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, sz: number,
  color: string, type: string
) {
  const s = sz * 1.8;
  ctx.save();
  ctx.translate(x, y);

  // Glow halo
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, s * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;

  switch (type) {
    case "iss": {
      ctx.globalAlpha = 0.9;
      // Truss
      ctx.fillRect(-s * 2.2, -s * 0.1, s * 4.4, s * 0.2);
      // Solar panels (4 pairs)
      ctx.globalAlpha = 0.65;
      for (const xOff of [-1.8, -0.8, 0.8, 1.8]) {
        ctx.fillRect(s * (xOff - 0.35), -s * 0.7, s * 0.7, s * 0.5);
        ctx.fillRect(s * (xOff - 0.35), s * 0.2, s * 0.7, s * 0.5);
      }
      // Core module
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-s * 0.25, -s * 0.2, s * 0.5, s * 0.4);
      break;
    }
    case "hubble": {
      ctx.globalAlpha = 0.85;
      // Body tube
      ctx.fillRect(-s * 0.3, -s * 1, s * 0.6, s * 2);
      // Solar panels
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-s * 1.8, -s * 0.2, s * 1.3, s * 0.4);
      ctx.fillRect(s * 0.5, -s * 0.2, s * 1.3, s * 0.4);
      // Bright center
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "jwst": {
      // Hexagonal mirror (simplified as hexagon)
      ctx.globalAlpha = 0.75;
      drawHex(ctx, 0, 0, s * 1.0);
      // Inner hex
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#fff";
      drawHex(ctx, 0, 0, s * 0.5);
      // Sunshield
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 1.3, s * 1.0);
      ctx.lineTo(s * 1.3, s * 1.0);
      ctx.lineTo(s * 0.9, s * 1.8);
      ctx.lineTo(-s * 0.9, s * 1.8);
      ctx.fill();
      break;
    }
    case "voyager": {
      // Dish
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fill();
      // Boom
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-s * 0.08, s * 0.6, s * 0.16, s * 1.5);
      // Bright center
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Sphere renderer (optimized with reusable canvas) ─────
function renderSphere(
  ctx: CanvasRenderingContext2D,
  tex: ImageData,
  cx: number, cy: number, R: number,
  rot: number, tilt: number,
  cachedCanvas: HTMLCanvasElement | null,
  cachedCtx: CanvasRenderingContext2D | null,
  setCache: (c: HTMLCanvasElement, x: CanvasRenderingContext2D) => void,
) {
  const tw = tex.width, th = tex.height, td = tex.data;
  const step = 2;
  const imgW = Math.ceil(R * 2 / step);
  const imgH = Math.ceil(R * 2 / step);

  let oc = cachedCanvas;
  let octx = cachedCtx;
  if (!oc || oc.width !== imgW || oc.height !== imgH) {
    oc = document.createElement("canvas");
    oc.width = imgW;
    oc.height = imgH;
    octx = oc.getContext("2d")!;
    setCache(oc, octx);
  }

  const outData = octx!.createImageData(imgW, imgH);
  const out = outData.data;
  const R2 = R * R;
  const cT = Math.cos(tilt), sT = Math.sin(tilt);
  // Light from upper-right
  const nlx = 0.59, nly = 0.39, nlz = 0.71;

  for (let py = 0; py < imgH; py++) {
    const sy = (py * step) - R;
    const sy2 = sy * sy;
    for (let px = 0; px < imgW; px++) {
      const sx = (px * step) - R;
      const d2 = sx * sx + sy2;
      if (d2 >= R2) continue;

      const nz = Math.sqrt(R2 - d2) / R;
      const nx = sx / R;
      let ny = -sy / R;

      const ny2 = ny * cT + nz * sT;
      const nz2 = -ny * sT + nz * cT;
      ny = ny2;

      const lat = Math.asin(ny > 1 ? 1 : ny < -1 ? -1 : ny);
      const lon = Math.atan2(nx, nz2) - rot;

      let u = ((lon / Math.PI + 1) / 2) % 1;
      if (u < 0) u += 1;
      const v = 0.5 - lat / Math.PI;

      const tx = (u * (tw - 1)) | 0;
      const ty = (v * (th - 1)) | 0;
      const ti = (ty * tw + tx) * 4;

      const dot = nx * nlx + ny * nly + nz * nlz;
      const light = dot > 0 ? 0.22 + 0.78 * dot : 0.22;

      // Boost colors slightly for vibrancy
      const idx = (py * imgW + px) * 4;
      out[idx]     = Math.min(255, (td[ti] * 1.15) * light) | 0;
      out[idx + 1] = Math.min(255, (td[ti + 1] * 1.15) * light) | 0;
      out[idx + 2] = Math.min(255, (td[ti + 2] * 1.2) * light) | 0;
      out[idx + 3] = 255;
    }
  }

  octx!.putImageData(outData, 0, 0);
  ctx.drawImage(oc!, cx - R, cy - R, R * 2, R * 2);
}
