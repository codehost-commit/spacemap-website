import type { CatalogObjectType } from '@spacemap/shared';

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

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

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotationRad = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotationRad + (Math.PI * 2 * i) / sides;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  kind: CatalogObjectType,
  cx: number,
  cy: number,
  size: number,
) {
  const r = size * 0.26;
  ctx.lineWidth = size * 0.08;
  switch (kind) {
    case 'payload':
      drawPolygon(ctx, cx, cy + size * 0.015, r, 3, -Math.PI / 2);
      ctx.fill();
      break;
    case 'rocket-body':
      roundRect(ctx, cx - size * 0.14, cy - size * 0.24, size * 0.28, size * 0.48, size * 0.08);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.34);
      ctx.lineTo(cx - size * 0.12, cy - size * 0.12);
      ctx.lineTo(cx + size * 0.12, cy - size * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    case 'debris':
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.7, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.28, cy + r);
      ctx.lineTo(cx - r * 0.78, cy + r * 0.22);
      ctx.lineTo(cx - r * 0.26, cy - r * 0.68);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      drawPolygon(ctx, cx, cy, r, 6, Math.PI / 6);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
  }
}

function drawPayloadDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const panelW = size * 0.34;
  const panelH = size * 0.13;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(cx - panelW - size * 0.1, cy - panelH / 2, panelW, panelH);
  ctx.fillRect(cx + size * 0.1, cy - panelH / 2, panelW, panelH);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  for (let side = 0; side < 2; side++) {
    const x0 = side === 0 ? cx - panelW - size * 0.1 : cx + size * 0.1;
    for (let i = 1; i < 4; i++) {
      const x = x0 + (panelW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, cy - panelH / 2);
      ctx.lineTo(x, cy + panelH / 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const bodyW = size * 0.2;
  const bodyH = size * 0.28;
  ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);
  ctx.beginPath();
  ctx.arc(cx, cy - bodyH / 2 - size * 0.06, size * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH / 2 - size * 0.11);
  ctx.lineTo(cx, cy - bodyH / 2);
  ctx.stroke();
}

function drawRocketBodyDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const bodyW = size * 0.22;
  const bodyH = size * 0.46;
  roundRect(ctx, cx - bodyW / 2, cy - bodyH * 0.38, bodyW, bodyH * 0.72, bodyW * 0.38);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH * 0.56);
  ctx.lineTo(cx - bodyW * 0.56, cy - bodyH * 0.14);
  ctx.lineTo(cx + bodyW * 0.56, cy - bodyH * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.48, cy + bodyH * 0.16);
  ctx.lineTo(cx - bodyW * 1.02, cy + bodyH * 0.42);
  ctx.lineTo(cx - bodyW * 0.2, cy + bodyH * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + bodyW * 0.48, cy + bodyH * 0.16);
  ctx.lineTo(cx + bodyW * 1.02, cy + bodyH * 0.42);
  ctx.lineTo(cx + bodyW * 0.2, cy + bodyH * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH * 0.22);
  ctx.lineTo(cx, cy + bodyH * 0.22);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDebrisDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.08, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.2, cy - size * 0.12);
  ctx.lineTo(cx + size * 0.06, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.24, cy + size * 0.08);
  ctx.lineTo(cx - size * 0.12, cy - size * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.18, cy + size * 0.02);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.16);
  ctx.lineTo(cx + size * 0.1, cy + size * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.28, cy - size * 0.02);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.16);
  ctx.lineTo(cx - size * 0.04, cy - size * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawUnknownDetail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.lineWidth = size * 0.08;
  drawPolygon(ctx, cx, cy, size * 0.22, 6, Math.PI / 6);
  ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

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
 * White-on-transparent marker icons so Cesium billboards can be tinted by
 * orbit class while still reading as different object types.
 */
export function buildObjectMarkerIcon(kind: CatalogObjectType, size = 28): string {
  return buildCanvasIcon(size, (ctx, cx, cy, iconSize) => drawMarker(ctx, kind, cx, cy, iconSize));
}

/**
 * Close-range billboards with slightly more descriptive silhouettes for each
 * catalog object type.
 */
export function buildObjectDetailIcon(kind: CatalogObjectType, size = 64): string {
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
