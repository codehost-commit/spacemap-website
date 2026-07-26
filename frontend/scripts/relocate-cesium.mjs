#!/usr/bin/env node
/**
 * Post-build fixup for vite-plugin-cesium when Vite `base` is a subpath.
 *
 * The plugin joins `outDir + CESIUM_BASE_URL + "Assets"` for its filesystem
 * copy, which — because CESIUM_BASE_URL has already been prefixed with the
 * base — nests the assets under `dist/${base}/cesium/`. GitHub Pages then
 * serves them from `${site}/${base}/${base}/cesium/…`, which 404s.
 *
 * This script moves everything under `dist/${base}/*` up into `dist/*`
 * so the HTML's `${base}/cesium/…` URLs resolve to `dist/cesium/…`.
 *
 * No-op when the base is `/` (root deploy) or when the nested dir doesn't
 * exist (plugin behaviour may change in a future version).
 */
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] ?? "dist");
const base = (process.env.VITE_BASE_URL ?? "/").replace(/^\/|\/$/g, "");
if (!base) {
  process.exit(0);
}

const nested = path.join(dist, base);
if (!fs.existsSync(nested) || !fs.statSync(nested).isDirectory()) {
  process.exit(0);
}

let moved = 0;
for (const entry of fs.readdirSync(nested)) {
  const from = path.join(nested, entry);
  const to = path.join(dist, entry);
  if (fs.existsSync(to)) {
    fs.rmSync(to, { recursive: true, force: true });
  }
  fs.renameSync(from, to);
  moved++;
}
fs.rmdirSync(nested);
console.log(`[relocate-cesium] promoted ${moved} entries from ${base}/ → dist root`);
