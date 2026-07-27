import { useStore } from "./store.js";
import type { CameraMode } from "./store.js";
import { ORBIT_CLASSES, type OrbitClass } from "@spacemap/shared";
import { getClockControls } from "../simulation/clock-controls.js";

/**
 * URL-hash state sync so a link like
 *   #sat=25544&cam=follow&t=1738000000&img=arcgis&f=LEO,GEO
 * restores the same view for anyone who opens it.
 *
 * We read the hash on install and push updates back with `replaceState` to
 * avoid polluting browser history.
 */

interface UrlState {
  sat?: number;
  compare?: number;
  cam?: CameraMode;
  img?: string;
  t?: number;
  f?: OrbitClass[];
  trail?: "off" | "selected" | "visible";
  heat?: boolean;
}

const DEBOUNCE_MS = 400;

export function installUrlState(): () => void {
  applyFromUrl();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(writeToUrl, DEBOUNCE_MS);
  });

  const onHashChange = () => applyFromUrl();
  window.addEventListener("hashchange", onHashChange);

  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener("hashchange", onHashChange);
    unsub();
  };
}

function applyFromUrl(): void {
  const state = parseHash(location.hash);
  if (state.sat != null) useStore.getState().select(state.sat);
  if (state.compare != null) useStore.getState().setCompare(state.compare);
  if (state.cam) useStore.getState().setCameraMode(state.cam);
  if (state.img) useStore.getState().setImagery(state.img);
  if (state.f) useStore.getState().setFilter(state.f);
  if (state.trail) useStore.getState().setTrailMode(state.trail);
  if (state.heat != null) useStore.getState().setHeatmap(state.heat);
  if (state.t) getClockControls()?.jumpTo(new Date(state.t));
}

function writeToUrl(): void {
  const s = useStore.getState();
  const parts: string[] = [];
  if (s.selectedNoradId != null) parts.push(`sat=${s.selectedNoradId}`);
  if (s.compareNoradId != null) parts.push(`compare=${s.compareNoradId}`);
  if (s.cameraMode !== "orbit") parts.push(`cam=${s.cameraMode}`);
  if (s.imageryId !== "arcgis") parts.push(`img=${s.imageryId}`);
  if (s.filter.size !== ORBIT_CLASSES.length) {
    parts.push(`f=${[...s.filter].join(",")}`);
  }
  if (s.trailMode !== "selected") parts.push(`trail=${s.trailMode}`);
  if (s.heatmapOn) parts.push(`heat=1`);
  // Only pin sim time when it's noticeably off from wall clock (paused or scrubbed).
  if (Math.abs(s.simTimeMs - Date.now()) > 60_000 || s.simPaused) {
    parts.push(`t=${Math.round(s.simTimeMs)}`);
  }

  const hash = parts.length > 0 ? "#" + parts.join("&") : "";
  if (hash === location.hash) return;
  history.replaceState(null, "", location.pathname + location.search + hash);
}

function parseHash(hash: string): UrlState {
  const out: UrlState = {};
  const s = hash.replace(/^#/, "");
  if (!s) return out;
  for (const pair of s.split("&")) {
    const [k, v = ""] = pair.split("=");
    switch (k) {
      case "sat":
        if (Number.isFinite(Number(v))) out.sat = Number(v);
        break;
      case "compare":
        if (Number.isFinite(Number(v))) out.compare = Number(v);
        break;
      case "cam":
        if (v === "orbit" || v === "follow" || v === "pov") out.cam = v;
        break;
      case "img":
        out.img = v;
        break;
      case "t":
        if (Number.isFinite(Number(v))) out.t = Number(v);
        break;
      case "f":
        out.f = v
          .split(",")
          .filter((c): c is OrbitClass => (ORBIT_CLASSES as readonly string[]).includes(c));
        break;
      case "trail":
        if (v === "off" || v === "selected" || v === "visible") out.trail = v;
        break;
      case "heat":
        out.heat = v === "1" || v === "true";
        break;
    }
  }
  return out;
}
