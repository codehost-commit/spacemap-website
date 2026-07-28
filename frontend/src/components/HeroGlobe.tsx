import { useEffect, useRef } from "react";

/**
 * Animated hero globe - Canvas 2D with real Earth texture + satellites.
 * Features:
 *  - Equirectangular Earth texture mapped onto a rotating sphere
 *  - ~1500 sharp satellite dots with motion trails
 *  - 4 featured spacecraft (ISS, Hubble, JWST, Voyager) drawn as
 *    tiny satellite silhouettes with solar-panel wings
 *  - Depth-sorted rendering with behind-earth dimming
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
  type: "iss" | "hubble" | "jwst" | "voyager";
}

// ── color palette (tracker-accurate) ─────────────────────
const PAL = [
  "#f23545","#f23545","#f23545",
  "#ff738d","#ff738d",
  "#ffb34d",
  "#ffffff","#ffffff",
  "#4dd8ff",
  "#33cc59",
];

function makeSats(n: number): Sat[] {
  const out: Sat[] = [];
  for (let i = 0; i < n; i++) {
    const b = Math.random();
    let r: number, inc: number;
    if (b < 0.70) { r = 1.06 + Math.random() * 0.32; inc = (25 + Math.random() * 75) * Math.PI / 180; }
    else if (b < 0.85) { r = 1.45 + Math.random() * 0.25; inc = (25 + Math.random() * 65) * Math.PI / 180; }
    else if (b < 0.95) { r = 1.78 + Math.random() * 0.06; inc = Math.random() * 12 * Math.PI / 180; }
    else { r = 1.15 + Math.random() * 0.70; inc = (30 + Math.random() * 60) * Math.PI / 180; }
    if (Math.random() > 0.5) inc = Math.PI - inc;
    out.push({
      r, inc,
      raan: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: (0.12 + Math.random() * 0.12) / Math.pow(r, 1.5),
      color: PAL[Math.floor(Math.random() * PAL.length)],
      sz: 0.6 + Math.random() * 0.8,
    });
  }
  return out;
}

function makeFeatured(): FeaturedSat[] {
  return [
    { label: "ISS", type: "iss", r: 1.10, inc: 51.6 * Math.PI / 180, raan: 0.3, phase: 0, spd: 0.18, color: "#ffffff", sz: 2.5 },
    { label: "Hubble", type: "hubble", r: 1.12, inc: 28.5 * Math.PI / 180, raan: 2.1, phase: Math.PI * 0.6, spd: 0.17, color: "#4dd8ff", sz: 2 },
    { label: "JWST", type: "jwst", r: 1.65, inc: 5 * Math.PI / 180, raan: 4.0, phase: Math.PI * 1.2, spd: 0.06, color: "#ffb34d", sz: 2.2 },
    { label: "Voyager", type: "voyager", r: 1.90, inc: 35 * Math.PI / 180, raan: 5.5, phase: Math.PI * 0.3, spd: 0.03, color: "#33cc59", sz: 1.8 },
  ];
}

// ── component ────────────────────────────────────────────
export function HeroGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sats = makeSats(1500);
    const featured = makeFeatured();
    let earthData: ImageData | null = null;

    // Load Earth texture
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
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    let raf = 0;
    const TILT = 0.35;
    const FOV = 3.6;

    // Pre-compute trail offsets (5 past positions per sat)
    const TRAIL_STEPS = 5;
    const TRAIL_DT = 0.12; // time step back per trail segment

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() * 0.001;
      ctx.clearRect(0, 0, w, h);

      const cxv = w / 2, cyv = h / 2;
      const R = Math.min(w, h) * 0.36;
      const earthRot = t * 0.05;

      // ── Atmosphere glow ─────────────────────────────
      const glowR = R * 1.22;
      const glow = ctx.createRadialGradient(cxv, cyv, R * 0.9, cxv, cyv, glowR);
      glow.addColorStop(0, "rgba(77,150,232,0.18)");
      glow.addColorStop(0.6, "rgba(77,150,232,0.06)");
      glow.addColorStop(1, "rgba(77,150,232,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cxv, cyv, glowR, 0, Math.PI * 2);
      ctx.fill();

      // ── Collect all drawable items with depth ───────
      type DrawItem = {
        sx: number; sy: number; depth: number;
        color: string; sz: number; behind: boolean;
        trail?: { sx: number; sy: number }[];
        featured?: FeaturedSat;
      };
      const items: DrawItem[] = [];

      // Helper: compute sat position at time T
      const satPos = (s: Sat | FeaturedSat, time: number) => {
        const angle = s.phase + time * s.spd;
        let px = s.r * Math.cos(angle), py = 0, pz = s.r * Math.sin(angle);
        const r1 = rotX(px, py, pz, s.inc); px = r1.x; py = r1.y; pz = r1.z;
        const r2 = rotY(px, py, pz, s.raan); px = r2.x; py = r2.y; pz = r2.z;
        const r3 = rotX(px, py, pz, TILT); px = r3.x; py = r3.y; pz = r3.z;
        const distXY = Math.sqrt(px * px + py * py);
        const behind = pz < 0 && distXY < 0.98;
        const d = FOV / (FOV + pz);
        return { sx: cxv + px * R * d, sy: cyv - py * R * d, depth: pz, behind, d };
      };

      // Regular satellites with trails
      for (const s of sats) {
        const p = satPos(s, t);
        const trail: { sx: number; sy: number }[] = [];
        for (let ti = 1; ti <= TRAIL_STEPS; ti++) {
          const tp = satPos(s, t - ti * TRAIL_DT);
          trail.push({ sx: tp.sx, sy: tp.sy });
        }
        items.push({
          sx: p.sx, sy: p.sy, depth: p.depth,
          color: s.color, sz: s.sz * p.d,
          behind: p.behind, trail,
        });
      }

      // Featured spacecraft
      for (const f of featured) {
        const p = satPos(f, t);
        const trail: { sx: number; sy: number }[] = [];
        for (let ti = 1; ti <= TRAIL_STEPS; ti++) {
          const tp = satPos(f, t - ti * TRAIL_DT);
          trail.push({ sx: tp.sx, sy: tp.sy });
        }
        items.push({
          sx: p.sx, sy: p.sy, depth: p.depth,
          color: f.color, sz: f.sz * p.d,
          behind: p.behind, trail, featured: f,
        });
      }

      // Sort back-to-front
      items.sort((a, b) => a.depth - b.depth);

      // ── Draw behind-earth items ─────────────────────
      for (const it of items) {
        if (!it.behind) continue;
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, it.sz * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Render Earth ────────────────────────────────
      if (earthData) {
        renderTexturedSphere(ctx, earthData, cxv, cyv, R, earthRot, TILT);
      } else {
        const grad = ctx.createRadialGradient(cxv - R * 0.2, cyv - R * 0.2, R * 0.05, cxv, cyv, R);
        grad.addColorStop(0, "#1a4a6c");
        grad.addColorStop(0.7, "#0e2540");
        grad.addColorStop(1, "#06101a");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cxv, cyv, R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fresnel rim
      const rim = ctx.createRadialGradient(cxv, cyv, R * 0.82, cxv, cyv, R);
      rim.addColorStop(0, "rgba(77,150,232,0)");
      rim.addColorStop(0.7, "rgba(77,150,232,0)");
      rim.addColorStop(0.9, "rgba(77,150,232,0.2)");
      rim.addColorStop(1, "rgba(142,216,255,0.35)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cxv, cyv, R, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw front items ────────────────────────────
      for (const it of items) {
        if (it.behind) continue;

        // Trail
        if (it.trail && it.trail.length > 0) {
          ctx.beginPath();
          ctx.moveTo(it.sx, it.sy);
          for (let i = 0; i < it.trail.length; i++) {
            ctx.lineTo(it.trail[i].sx, it.trail[i].sy);
          }
          ctx.strokeStyle = it.color;
          ctx.lineWidth = it.featured ? 1.2 : 0.6;
          ctx.globalAlpha = 0.3;
          ctx.stroke();
        }

        if (it.featured) {
          // Draw spacecraft silhouette
          drawSpacecraft(ctx, it.sx, it.sy, it.sz, it.color, it.featured.type);

          // Label
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = it.color;
          ctx.font = `bold ${Math.max(9, it.sz * 3.5)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(it.featured.label, it.sx, it.sy - it.sz * 4);
          ctx.globalAlpha = 1;
        } else {
          // Bright sharp dot
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = it.color;
          ctx.beginPath();
          ctx.arc(it.sx, it.sy, it.sz, 0, Math.PI * 2);
          ctx.fill();

          // Tiny bright center
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(it.sx, it.sy, it.sz * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
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

// ── Draw a tiny spacecraft silhouette ────────────────────
function drawSpacecraft(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, sz: number,
  color: string, type: string
) {
  const s = sz * 2; // scale factor
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.95;

  switch (type) {
    case "iss": {
      // Body (rectangle)
      ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6);
      // Solar panels (wide rectangles on each side)
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-s * 2.5, -s * 0.5, s * 1.8, s);
      ctx.fillRect(s * 0.7, -s * 0.5, s * 1.8, s);
      // Panel lines
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(-s * 2.5, -s * 0.5, s * 0.9, s);
      ctx.strokeRect(-s * 1.6, -s * 0.5, s * 0.9, s);
      ctx.strokeRect(s * 0.7, -s * 0.5, s * 0.9, s);
      ctx.strokeRect(s * 1.6, -s * 0.5, s * 0.9, s);
      // Bright core
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "hubble": {
      // Cylindrical body
      ctx.fillRect(-s * 0.4, -s * 1.2, s * 0.8, s * 2.4);
      // Solar panels
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-s * 2, -s * 0.3, s * 1.4, s * 0.6);
      ctx.fillRect(s * 0.6, -s * 0.3, s * 1.4, s * 0.6);
      // Aperture
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, -s * 1.2, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "jwst": {
      // Hexagonal mirror segments
      ctx.globalAlpha = 0.8;
      const hexR = s * 0.7;
      for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
          if (row === 0 && col === 0) continue;
          const hx = col * hexR * 0.9;
          const hy = row * hexR * 0.8 + (col % 2 === 0 ? 0 : hexR * 0.4);
          drawHex(ctx, hx, hy, hexR * 0.45);
        }
      }
      // Center hex
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      drawHex(ctx, 0, 0, hexR * 0.45);
      // Sunshield below
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 1.5, s * 1.2);
      ctx.lineTo(s * 1.5, s * 1.2);
      ctx.lineTo(s * 1, s * 2);
      ctx.lineTo(-s * 1, s * 2);
      ctx.fill();
      break;
    }
    case "voyager": {
      // Dish
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.fill();
      // Boom
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-s * 0.15, s * 0.8, s * 0.3, s * 2);
      // RTGs
      ctx.fillRect(-s * 1.2, s * 2.2, s * 0.5, s * 0.8);
      ctx.fillRect(s * 0.7, s * 2.2, s * 0.5, s * 0.8);
      // Center
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
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
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Texture-mapped sphere renderer ───────────────────────
function renderTexturedSphere(
  ctx: CanvasRenderingContext2D,
  tex: ImageData,
  cx: number, cy: number, R: number,
  rotAngle: number, tilt: number
) {
  const tw = tex.width, th = tex.height, td = tex.data;

  const step = 2;
  const imgW = Math.ceil(R * 2 / step);
  const imgH = Math.ceil(R * 2 / step);
  const offCanvas = document.createElement("canvas");
  offCanvas.width = imgW;
  offCanvas.height = imgH;
  const octx = offCanvas.getContext("2d")!;
  const outData = octx.createImageData(imgW, imgH);
  const out = outData.data;

  const R2 = R * R;
  const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
  const lLen = Math.sqrt(0.36 + 0.16 + 0.49);
  const nlx = 0.6 / lLen, nly = 0.4 / lLen, nlz = 0.7 / lLen;

  for (let py = 0; py < imgH; py++) {
    const sy = (py * step) - R;
    for (let px = 0; px < imgW; px++) {
      const sx = (px * step) - R;
      const d2 = sx * sx + sy * sy;
      if (d2 >= R2) continue;

      const nz = Math.sqrt(R2 - d2) / R;
      let nx = sx / R;
      let ny = -sy / R;

      const ny2 = ny * cosTilt + nz * sinTilt;
      const nz2 = -ny * sinTilt + nz * cosTilt;
      ny = ny2;

      const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
      const lon = Math.atan2(nx, nz2) - rotAngle;

      let u = ((lon / Math.PI + 1) / 2) % 1;
      if (u < 0) u += 1;
      const v = 0.5 - lat / Math.PI;

      const tx = Math.floor(u * (tw - 1));
      const ty = Math.floor(v * (th - 1));
      const ti = (ty * tw + tx) * 4;

      const dot = Math.max(0, nx * nlx + ny * nly + nz * nlz);
      const light = 0.25 + 0.75 * dot;

      const idx = (py * imgW + px) * 4;
      out[idx]     = Math.min(255, td[ti] * light);
      out[idx + 1] = Math.min(255, td[ti + 1] * light);
      out[idx + 2] = Math.min(255, td[ti + 2] * light);
      out[idx + 3] = 255;
    }
  }

  octx.putImageData(outData, 0, 0);
  ctx.drawImage(offCanvas, cx - R, cy - R, R * 2, R * 2);
}
