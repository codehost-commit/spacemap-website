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

export default defineConfig({
  plugins: [react(), cesium({ cesiumBuildRootPath, cesiumBuildPath })],
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
