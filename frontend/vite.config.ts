import { defineConfig } from "vite";
import { createRequire } from "node:module";
import path from "node:path";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

// In a monorepo, npm hoists `cesium` to the root `node_modules/`. Resolve its
// build directory explicitly so vite-plugin-cesium finds the assets regardless
// of workspace layout.
const require = createRequire(import.meta.url);
const cesiumPkgDir = path.dirname(require.resolve("cesium/package.json"));
const cesiumBuildRootPath = path.join(cesiumPkgDir, "Build");
const cesiumBuildPath = path.join(cesiumPkgDir, "Build", "Cesium/");

// GitHub Pages serves the site from `/${repo}/`. Override at build time with
// `VITE_BASE_URL=/YourRepo/ npm run build`. Defaults to `/SpaceMap/` because
// that's the intended repository name; falls back to `/` for local preview.
const baseUrl = process.env.VITE_BASE_URL ?? "/";

export default defineConfig({
  base: baseUrl,
  cacheDir: path.resolve(__dirname, ".vite-cache"),
  plugins: [react(), cesium({ cesiumBuildRootPath, cesiumBuildPath })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // lucide-react's ESM entry is missing; point Vite at the CJS build
      "lucide-react": path.resolve(__dirname, "../node_modules/lucide-react/dist/cjs/lucide-react.js"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
