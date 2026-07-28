import { useEffect, useRef } from "react";

/**
 * Animated hero globe rendered with Canvas 2D.
 * No Three.js dependency - pure math + canvas drawing.
 * ~2500 satellite particles orbit a procedural Earth in real time.
 */

interface Sat {
  radius: number;
  inclination: number;
  raan: number;
  phase: number;
  speed: number;
  color: string;
  size: number;
}

// Color palette matching the real SpaceMap tracker
const COLORS = [
  "#f23545", "#f23545", "#f23545", // red (heavy)
  "#ff738d", "#ff738d",             // pink
  "#ffb34d",                        // orange
  "#ffffff", "#ffffff",              // white
  "#4dd8ff",                        // cyan
  "#33cc59",                        // green
  "#4d4dff",                        // blue
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function HeroGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate satellites
    const SAT_COUNT = 2500;
    const sats: Sat[] = [];
    for (let i = 0; i < SAT_COUNT; i++) {
      const bucket = Math.random();
      let radius: number;
      let inclination: number;

      if (bucket < 0.70) {
        radius = 1.08 + Math.random() * 0.35;             // LEO
        inclination = (20 + Math.random() * 80) * Math.PI / 180;
      } else if (bucket < 0.85) {
        radius = 1.50 + Math.random() * 0.30;             // MEO
        inclination = (20 + Math.random() * 70) * Math.PI / 180;
      } else if (bucket < 0.95) {
        radius = 1.85 + Math.random() * 0.08;             // GEO
        inclination = Math.random() * 15 * Math.PI / 180; // near equatorial
      } else {
        radius = 1.20 + Math.random() * 0.80;             // HEO
        inclination = (30 + Math.random() * 60) * Math.PI / 180;
      }

      if (Math.random() > 0.5) inclination = Math.PI - inclination;

      sats.push({
        radius,
        inclination,
        raan: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        speed: (0.15 + Math.random() * 0.15) / Math.pow(radius, 1.5),
        color: randomColor(),
        size: 1 + Math.random() * 1.5,
      });
    }

    // Grid dots on Earth surface
    const gridDots: { lat: number; lon: number }[] = [];
    for (let lat = -80; lat <= 80; lat += 18) {
      for (let lon = 0; lon < 360; lon += 18) {
        gridDots.push({ lat: lat * Math.PI / 180, lon: lon * Math.PI / 180 });
      }
    }

    let raf = 0;
    let w = 0;
    let h = 0;

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

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() * 0.001;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const globeR = Math.min(w, h) * 0.35;
      const scale = globeR;

      // Camera tilt
      const camTiltX = 0.3;
      const earthRotY = t * 0.06;

      // ─── Draw Earth ───────────────────────────────────
      // Atmosphere glow
      const glowGrad = ctx.createRadialGradient(cx, cy, globeR * 0.85, cx, cy, globeR * 1.25);
      glowGrad.addColorStop(0, "rgba(77, 150, 232, 0.15)");
      glowGrad.addColorStop(0.5, "rgba(77, 150, 232, 0.06)");
      glowGrad.addColorStop(1, "rgba(77, 150, 232, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, globeR * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Earth sphere with gradient
      const earthGrad = ctx.createRadialGradient(
        cx - globeR * 0.25, cy - globeR * 0.25, globeR * 0.05,
        cx, cy, globeR
      );
      earthGrad.addColorStop(0, "#1a3a5c");
      earthGrad.addColorStop(0.4, "#0e2540");
      earthGrad.addColorStop(0.8, "#0a1c30");
      earthGrad.addColorStop(1, "#06101a");
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx.fill();

      // Fresnel rim
      const rimGrad = ctx.createRadialGradient(cx, cy, globeR * 0.75, cx, cy, globeR);
      rimGrad.addColorStop(0, "rgba(77, 150, 232, 0)");
      rimGrad.addColorStop(0.85, "rgba(77, 150, 232, 0)");
      rimGrad.addColorStop(0.95, "rgba(77, 150, 232, 0.25)");
      rimGrad.addColorStop(1, "rgba(142, 216, 255, 0.4)");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx.fill();

      // Grid dots on surface (only front-facing)
      ctx.fillStyle = "rgba(142, 216, 255, 0.25)";
      for (const dot of gridDots) {
        const phi = Math.PI / 2 - dot.lat;
        let px = Math.sin(phi) * Math.cos(dot.lon + earthRotY);
        let py = Math.cos(phi);
        let pz = Math.sin(phi) * Math.sin(dot.lon + earthRotY);

        // Camera tilt
        const r = rotX(px, py, pz, camTiltX);
        px = r.x; py = r.y; pz = r.z;

        if (pz > -0.1) { // front-facing
          const p = project(px, py, pz, cx, cy, scale);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ─── Collect all satellites with depth for sorting ──
      type DrawItem = { sx: number; sy: number; depth: number; color: string; size: number; behind: boolean };
      const items: DrawItem[] = [];

      for (const sat of sats) {
        const angle = sat.phase + t * sat.speed;
        const r = sat.radius;

        // Position in orbital plane
        let px = r * Math.cos(angle);
        let py = 0;
        let pz = r * Math.sin(angle);

        // Rotate by inclination (around X)
        const r1 = rotX(px, py, pz, sat.inclination);
        px = r1.x; py = r1.y; pz = r1.z;

        // Rotate by RAAN (around Y)
        const r2 = rotY(px, py, pz, sat.raan);
        px = r2.x; py = r2.y; pz = r2.z;

        // Camera tilt
        const r3 = rotX(px, py, pz, camTiltX);
        px = r3.x; py = r3.y; pz = r3.z;

        const p = project(px, py, pz, cx, cy, scale);

        // Check if satellite is behind the Earth
        const distFromCenter = Math.sqrt(px * px + py * py);
        const behind = pz < 0 && distFromCenter < 1.0;

        items.push({
          sx: p.sx,
          sy: p.sy,
          depth: pz,
          color: sat.color,
          size: sat.size * (0.7 + 0.3 * p.depth), // perspective size
          behind,
        });
      }

      // Sort by depth (back to front)
      items.sort((a, b) => a.depth - b.depth);

      // Draw behind-earth satellites (dimmed)
      for (const item of items) {
        if (!item.behind) continue;
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy, item.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw front satellites with glow
      for (const item of items) {
        if (item.behind) continue;

        // Glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy, item.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy, item.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ─── Faint orbit ring guides ──────────────────────
      ctx.strokeStyle = "rgba(204, 170, 51, 0.2)";
      ctx.lineWidth = 0.8;
      drawOrbitEllipse(ctx, cx, cy, scale, 1.89, 0.08, 0, camTiltX);

      ctx.strokeStyle = "rgba(77, 150, 232, 0.1)";
      ctx.lineWidth = 0.5;
      drawOrbitEllipse(ctx, cx, cy, scale, 1.30, 0.9, -0.2, camTiltX);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

/** Draw an orbit ring as a projected ellipse */
function drawOrbitEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  radius: number, tiltX: number, tiltZ: number, camTiltX: number
) {
  ctx.beginPath();
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    let px = radius * Math.cos(a);
    let py = 0;
    let pz = radius * Math.sin(a);

    // Ring tilt
    const r1 = rotX(px, py, pz, tiltX);
    px = r1.x; py = r1.y; pz = r1.z;

    // Z rotation
    if (tiltZ !== 0) {
      const c = Math.cos(tiltZ), s = Math.sin(tiltZ);
      const nx = px * c - py * s;
      const ny = px * s + py * c;
      px = nx; py = ny;
    }

    // Camera tilt
    const r2 = rotX(px, py, pz, camTiltX);
    px = r2.x; py = r2.y; pz = r2.z;

    const p = project(px, py, pz, cx, cy, scale);
    if (i === 0) ctx.moveTo(p.sx, p.sy);
    else ctx.lineTo(p.sx, p.sy);
  }
  ctx.stroke();
}

function rotX(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x, y: y * c - z * s, z: y * s + z * c };
}

function rotY(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

function project(
  x: number, y: number, z: number,
  cx: number, cy: number, scale: number
): { sx: number; sy: number; depth: number } {
  const fov = 3.6;
  const d = fov / (fov + z);
  return { sx: cx + x * scale * d, sy: cy - y * scale * d, depth: z };
}
