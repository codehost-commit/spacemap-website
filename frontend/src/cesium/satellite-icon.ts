/**
 * Canvas-drawn satellite silhouette used by BillboardCollection.
 * White pixels so Cesium.Billboard.color can tint per orbit class.
 * Generated at module init so there's no image asset dependency.
 */
export function buildSatelliteIcon(size = 64): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = size / 2;
  const cy = size / 2;

  // Solar panels — two rectangles either side of the body.
  const panelW = size * 0.36;
  const panelH = size * 0.14;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(cx - panelW - size * 0.09, cy - panelH / 2, panelW, panelH);
  ctx.fillRect(cx + size * 0.09, cy - panelH / 2, panelW, panelH);
  // Panel gridlines for detail.
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  const cells = 4;
  for (let side = 0; side < 2; side++) {
    const x0 = side === 0 ? cx - panelW - size * 0.09 : cx + size * 0.09;
    for (let i = 1; i < cells; i++) {
      const x = x0 + (panelW * i) / cells;
      ctx.beginPath();
      ctx.moveTo(x, cy - panelH / 2);
      ctx.lineTo(x, cy + panelH / 2);
      ctx.stroke();
    }
  }

  // Body — filled square with a slightly darker outline.
  ctx.globalAlpha = 1;
  const bodyW = size * 0.22;
  const bodyH = size * 0.28;
  ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);

  // Antenna dish stub on top.
  ctx.beginPath();
  ctx.arc(cx, cy - bodyH / 2 - size * 0.06, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyH / 2 - size * 0.12);
  ctx.lineTo(cx, cy - bodyH / 2);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
