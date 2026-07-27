#!/usr/bin/env node
/**
 * Convert an HYG CSV (columns include ra, dec, mag, ci) into a compact binary
 * SpaceMap ships to the browser:
 *
 *   Header : uint32  count            (little-endian)
 *   Per star (16 bytes):
 *     float32  ra_radians
 *     float32  dec_radians
 *     float32  apparent_magnitude
 *     float32  colour_index_BV
 *
 * Stars are filtered to magnitude ≤ MAG_LIMIT (default 7.0) and sorted brightest
 * first so a truncated read at any offset still yields the most-visible stars.
 *
 * Usage:  node build-stars.mjs <input.csv> <output.bin> [magLimit]
 */
import fs from "node:fs";

const [, , inPath, outPath, magArg] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: build-stars.mjs <in.csv> <out.bin> [magLimit=7.0]");
  process.exit(1);
}
const MAG_LIMIT = Number(magArg ?? 7.0);

const text = fs.readFileSync(inPath, "utf8");
const lines = text.split(/\r?\n/);
if (lines.length < 2) {
  console.error("empty CSV");
  process.exit(1);
}

const header = parseCsvRow(lines[0]);
const raIdx = header.indexOf("ra");
const decIdx = header.indexOf("dec");
const magIdx = header.indexOf("mag");
const ciIdx = header.indexOf("ci");
if (raIdx < 0 || decIdx < 0 || magIdx < 0) {
  console.error("CSV missing required columns (ra/dec/mag)");
  process.exit(1);
}

const stars = [];
for (let i = 1; i < lines.length; i++) {
  const row = lines[i];
  if (!row) continue;
  const cols = parseCsvRow(row);
  const mag = Number(cols[magIdx]);
  if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue;
  const raHours = Number(cols[raIdx]);
  const decDeg = Number(cols[decIdx]);
  if (!Number.isFinite(raHours) || !Number.isFinite(decDeg)) continue;
  const ci = ciIdx >= 0 ? Number(cols[ciIdx]) : NaN;
  stars.push([
    (raHours * Math.PI) / 12,           // RA (hours → radians)
    (decDeg * Math.PI) / 180,           // Dec (degrees → radians)
    mag,
    Number.isFinite(ci) ? ci : 0,
  ]);
}

stars.sort((a, b) => a[2] - b[2]); // brightest first

const buf = new ArrayBuffer(4 + stars.length * 16);
const view = new DataView(buf);
view.setUint32(0, stars.length, true);
const floats = new Float32Array(buf, 4);
for (let i = 0; i < stars.length; i++) {
  floats[i * 4] = stars[i][0];
  floats[i * 4 + 1] = stars[i][1];
  floats[i * 4 + 2] = stars[i][2];
  floats[i * 4 + 3] = stars[i][3];
}
fs.writeFileSync(outPath, Buffer.from(buf));
console.log(
  `Wrote ${stars.length.toLocaleString()} stars (${(buf.byteLength / 1024).toFixed(1)} KB) to ${outPath}`,
);

/** Minimal CSV row parser — HYG rows may contain commas inside "quoted" cells. */
function parseCsvRow(row) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (inQuotes) {
      if (c === '"' && row[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}
