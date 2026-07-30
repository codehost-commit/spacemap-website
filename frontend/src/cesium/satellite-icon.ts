import type { CatalogObjectType } from '@spacemap/shared';

/**
 * Object-type icons for the Cesium billboards. Two variants per type:
 *   • Marker (far LOD) — compact, high-contrast silhouette that reads at
 *     ~8-16 px on screen.
 *   • Detail (close LOD) — richer silhouette that reveals the object's shape
 *     when the user zooms in.
 *
 * All icons are drawn white-on-transparent so Cesium can tint them by orbit
 * class (LEO, MEO, GEO, HEO, POLAR, SSO) without redrawing.
 */

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

// ─── Shared drawing primitives ─────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// ─── FAR-LOD MARKERS (compact ~8–16px) ─────────────────────────────────────
// These need to read instantly at a tiny size, so we use bold, distinct
// silhouettes with a subtle glow ring for contrast against the imagery.

function drawGlowRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPayloadMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Squarish bus with two long solar wings — instantly reads as "satellite".
  drawGlowRing(ctx, cx, cy, size * 0.42);
  const bodyW = size * 0.16;
  const bodyH = size * 0.24;
  const panelW = size * 0.36;
  const panelH = size * 0.09;
  // Solar panels (wings)
  ctx.fillRect(cx - panelW - bodyW * 0.5, cy - panelH / 2, panelW, panelH);
  ctx.fillRect(cx + bodyW * 0.5, cy - panelH / 2, panelW, panelH);
  // Central bus
  roundRect(ctx, cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH, size * 0.04);
  ctx.fill();
}

function drawRocketBodyMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  // Elongated cylinder with a pointed nose — the classic rocket silhouette.
  drawGlowRing(ctx, cx, cy, size * 0.42);
  const bodyW = size * 0.18;
  const bodyH = size * 0.44;
  const noseH = size * 0.14;
  // Body
  roundRect(ctx, cx - bodyW / 2, cy - bodyH / 2 + noseH, bodyW, bodyH - noseH, bodyW * 0.25);
  ctx.fill();
  // Nose cone
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH / 2);
  ctx.lineTo(cx - bodyW / 2, cy - bodyH / 2 + noseH);
  ctx.lineTo(cx + bodyW / 2, cy - bodyH / 2 + noseH);
  ctx.closePath();
  ctx.fill();
  // Fins at base
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2, cy + bodyH / 2 - size * 0.06);
  ctx.lineTo(cx - bodyW * 0.9, cy + bodyH / 2);
  ctx.lineTo(cx - bodyW / 2, cy + bodyH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + bodyW / 2, cy + bodyH / 2 - size * 0.06);
  ctx.lineTo(cx + bodyW * 0.9, cy + bodyH / 2);
  ctx.lineTo(cx + bodyW / 2, cy + bodyH / 2);
  ctx.closePath();
  ctx.fill();
}

function drawDebrisMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // A cluster of three jagged shards — deliberately irregular so it doesn't
  // look "designed" like a spacecraft.
  drawGlowRing(ctx, cx, cy, size * 0.42);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.06, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.16, cy - size * 0.06);
  ctx.lineTo(cx + size * 0.02, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.02, cy + size * 0.04);
  ctx.lineTo(cx + size * 0.22, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.05, cy + size * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.2, cy + size * 0.04);
  ctx.lineTo(cx - size * 0.06, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.22, cy + size * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawUnknownMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Diamond outline with a subtle dot — reads as "tracked but unclassified".
  drawGlowRing(ctx, cx, cy, size * 0.42);
  const r = size * 0.22;
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  kind: CatalogObjectType,
  cx: number,
  cy: number,
  size: number,
) {
  switch (kind) {
    case 'payload':
      drawPayloadMarker(ctx, cx, cy, size);
      break;
    case 'rocket-body':
      drawRocketBodyMarker(ctx, cx, cy, size);
      break;
    case 'debris':
      drawDebrisMarker(ctx, cx, cy, size);
      break;
    default:
      drawUnknownMarker(ctx, cx, cy, size);
      break;
  }
}

// ─── CLOSE-LOD DETAIL ICONS (richer, ~32–64px) ─────────────────────────────

function drawPayloadDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Realistic satellite with articulated solar arrays, main bus, antenna dish,
  // and a small comms boom.
  const panelW = size * 0.36;
  const panelH = size * 0.16;
  const bodyW = size * 0.22;
  const bodyH = size * 0.3;

  // Solar arrays with cell grid
  const leftX = cx - bodyW / 2 - panelW - size * 0.03;
  const rightX = cx + bodyW / 2 + size * 0.03;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(leftX, cy - panelH / 2, panelW, panelH);
  ctx.fillRect(rightX, cy - panelH / 2, panelW, panelH);
  // Array support struts
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2, cy);
  ctx.lineTo(leftX + panelW, cy);
  ctx.moveTo(cx + bodyW / 2, cy);
  ctx.lineTo(rightX, cy);
  ctx.stroke();
  // Cell subdivisions
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(leftX + (panelW * i) / 5, cy - panelH / 2);
    ctx.lineTo(leftX + (panelW * i) / 5, cy + panelH / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rightX + (panelW * i) / 5, cy - panelH / 2);
    ctx.lineTo(rightX + (panelW * i) / 5, cy + panelH / 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(leftX, cy);
  ctx.lineTo(leftX + panelW, cy);
  ctx.moveTo(rightX, cy);
  ctx.lineTo(rightX + panelW, cy);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Central bus
  roundRect(ctx, cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH, size * 0.03);
  ctx.fill();

  // Antenna dish (top)
  ctx.beginPath();
  ctx.arc(cx, cy - bodyH / 2 - size * 0.06, size * 0.07, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH / 2 - size * 0.13);
  ctx.lineTo(cx, cy - bodyH / 2);
  ctx.stroke();

  // Instrument boom (bottom)
  ctx.beginPath();
  ctx.moveTo(cx, cy + bodyH / 2);
  ctx.lineTo(cx, cy + bodyH / 2 + size * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + bodyH / 2 + size * 0.12, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function drawRocketBodyDetail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  // Upper-stage rocket booster — cylindrical body, nozzle bell, nose cone,
  // and side stringers.
  const bodyW = size * 0.24;
  const bodyH = size * 0.48;
  const noseH = size * 0.14;
  const nozzleH = size * 0.1;

  // Body
  ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2 + noseH, bodyW, bodyH - noseH - nozzleH);

  // Nose cone
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH / 2);
  ctx.lineTo(cx - bodyW / 2, cy - bodyH / 2 + noseH);
  ctx.lineTo(cx + bodyW / 2, cy - bodyH / 2 + noseH);
  ctx.closePath();
  ctx.fill();

  // Engine nozzle (trapezoid)
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2, cy + bodyH / 2 - nozzleH);
  ctx.lineTo(cx + bodyW / 2, cy + bodyH / 2 - nozzleH);
  ctx.lineTo(cx + bodyW * 0.7, cy + bodyH / 2);
  ctx.lineTo(cx - bodyW * 0.7, cy + bodyH / 2);
  ctx.closePath();
  ctx.fill();

  // Nozzle throat highlight
  ctx.globalAlpha = 0.35;
  ctx.fillRect(cx - bodyW * 0.55, cy + bodyH / 2 - nozzleH * 0.15, bodyW * 1.1, nozzleH * 0.15);
  ctx.globalAlpha = 1;

  // Stringers (vertical lines along the body)
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.28, cy - bodyH / 2 + noseH + size * 0.02);
  ctx.lineTo(cx - bodyW * 0.28, cy + bodyH / 2 - nozzleH - size * 0.02);
  ctx.moveTo(cx + bodyW * 0.28, cy - bodyH / 2 + noseH + size * 0.02);
  ctx.lineTo(cx + bodyW * 0.28, cy + bodyH / 2 - nozzleH - size * 0.02);
  ctx.moveTo(cx, cy - bodyH / 2 + noseH + size * 0.02);
  ctx.lineTo(cx, cy + bodyH / 2 - nozzleH - size * 0.02);
  ctx.stroke();
  // Circumferential band
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2, cy);
  ctx.lineTo(cx + bodyW / 2, cy);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDebrisDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Jagged tumbling fragment — irregular, no symmetry, with a couple of
  // smaller shards floating alongside. Deliberately raw and organic.
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.02, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.18);
  ctx.lineTo(cx + size * 0.26, cy - size * 0.02);
  ctx.lineTo(cx + size * 0.14, cy + size * 0.18);
  ctx.lineTo(cx - size * 0.08, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.24, cy + size * 0.06);
  ctx.lineTo(cx - size * 0.2, cy - size * 0.14);
  ctx.closePath();
  ctx.fill();

  // Rough surface detail (darker facets)
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.02, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.08, cy - size * 0.04);
  ctx.lineTo(cx - size * 0.2, cy - size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.14, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.06, cy + size * 0.02);
  ctx.lineTo(cx + size * 0.26, cy - size * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Two orbiting fragment satellites
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.3, cy + size * 0.16);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.24);
  ctx.lineTo(cx + size * 0.26, cy + size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.32, cy - size * 0.02);
  ctx.lineTo(cx - size * 0.24, cy - size * 0.16);
  ctx.lineTo(cx - size * 0.16, cy - size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawUnknownDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Question-mark-in-a-shield motif — dashed hexagon outline with a ? glyph.
  ctx.lineWidth = size * 0.05;
  const r = size * 0.26;
  ctx.setLineDash([size * 0.06, size * 0.04]);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (Math.PI / 3) * i;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // "?" glyph — hook + dot
  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.06, size * 0.08, Math.PI * 0.9, Math.PI * 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.02);
  ctx.lineTo(cx, cy + size * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.13, size * 0.024, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Builders ──────────────────────────────────────────────────────────────

function buildCanvasIcon(
  size: number,
  painter: (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void,
) {
  const { canvas, ctx } = makeCanvas(size);
  if (!ctx) return '';
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  painter(ctx, size / 2, size / 2, size);
  return canvas.toDataURL('image/png');
}

/**
 * White-on-transparent marker icons for the far-LOD billboard collection.
 * Cesium tints them by orbit class at draw time.
 */
export function buildObjectMarkerIcon(kind: CatalogObjectType, size = 32): string {
  return buildCanvasIcon(size, (ctx, cx, cy, iconSize) => drawMarker(ctx, kind, cx, cy, iconSize));
}

/**
 * Close-range detail icons for the near-LOD billboard collection.
 */
export function buildObjectDetailIcon(kind: CatalogObjectType, size = 72): string {
  return buildCanvasIcon(size, (ctx, cx, cy, iconSize) => {
    switch (kind) {
      case 'payload':
        drawPayloadDetail(ctx, cx, cy, iconSize);
        break;
      case 'rocket-body':
        drawRocketBodyDetail(ctx, cx, cy, iconSize);
        break;
      case 'debris':
        drawDebrisDetail(ctx, cx, cy, iconSize);
        break;
      default:
        drawUnknownDetail(ctx, cx, cy, iconSize);
        break;
    }
  });
}
