import * as Cesium from "cesium";
import { adminLog } from "./admin-log.js";
import { getInstruments } from "./registry.js";
import { useStore } from "../state/store.js";

/**
 * Continuous engine instrumentation — runs from GlobeCanvas mount until
 * unmount and pumps events into the admin log. Everything is throttled so
 * the log stays useful (we want ~10 messages/s, not 10 000).
 */
export function installInstrumentation(): () => void {
  // -------- FPS meter --------
  let frames = 0;
  let lastFpsMs = performance.now();
  let raf = 0;
  const fpsSamples: number[] = [];
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - lastFpsMs >= 1000) {
      const fps = Math.round((frames * 1000) / (now - lastFpsMs));
      fpsSamples.push(fps);
      if (fpsSamples.length > 300) fpsSamples.shift();
      const memMb = readHeapMb();
      adminLog.push("main", {
        channel: "fps",
        severity: "info",
        text: `${fps} fps • frame ${((now - lastFpsMs) / frames).toFixed(1)}ms • heap ${memMb ?? "?"}MB`,
        data: { fps, frameTimeMs: (now - lastFpsMs) / frames, heapMb: memMb },
      });
      frames = 0;
      lastFpsMs = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // -------- Store change stream --------
  let lastSnapshotTick = -1;
  let lastSelection: number | null | undefined = undefined;
  let lastCameraMode = "";
  let lastImagery = "";
  let lastTrailMode = "";
  let lastHeatmap: boolean | undefined;
  let lastTerminator: boolean | undefined;
  let lastGraticule: boolean | undefined;
  let lastCountries: boolean | undefined;
  let lastCities: boolean | undefined;
  let lastMultiplier = 1;
  let lastPaused = false;

  const unsub = useStore.subscribe((s) => {
    if (s.snapshot && s.snapshotTick !== lastSnapshotTick) {
      lastSnapshotTick = s.snapshotTick;
      adminLog.push("main", {
        channel: "sat",
        severity: "info",
        text: `snapshot #${s.snapshotTick} • ${s.snapshot.count.toLocaleString()} sats @ ${new Date(s.snapshot.timeMs).toISOString().slice(11, 19)}`,
        data: { tick: s.snapshotTick, count: s.snapshot.count, simTimeMs: s.snapshot.timeMs },
      });
    }
    if (s.selectedNoradId !== lastSelection) {
      lastSelection = s.selectedNoradId;
      if (s.selectedNoradId != null) {
        adminLog.push("main", {
          channel: "ui",
          severity: "info",
          text: `select NORAD ${s.selectedNoradId} (${s.indexByNorad.get(s.selectedNoradId) ?? "?"})`,
          data: { noradId: s.selectedNoradId },
        });
      } else {
        adminLog.push("main", { channel: "ui", severity: "info", text: "deselect" });
      }
    }
    if (s.cameraMode !== lastCameraMode) {
      lastCameraMode = s.cameraMode;
      adminLog.push("main", {
        channel: "cam",
        severity: "info",
        text: `camera mode → ${s.cameraMode}`,
      });
    }
    if (s.imageryId !== lastImagery) {
      lastImagery = s.imageryId;
      adminLog.push("main", {
        channel: "ui",
        severity: "info",
        text: `imagery → ${s.imageryId}`,
      });
    }
    if (s.trailMode !== lastTrailMode) {
      lastTrailMode = s.trailMode;
      adminLog.push("main", { channel: "ui", severity: "info", text: `trails → ${s.trailMode}` });
    }
    if (s.heatmapOn !== lastHeatmap) {
      lastHeatmap = s.heatmapOn;
      adminLog.push("main", { channel: "ui", severity: "info", text: `heatmap ${s.heatmapOn ? "ON" : "OFF"}` });
    }
    if (s.terminatorOn !== lastTerminator) {
      lastTerminator = s.terminatorOn;
      adminLog.push("main", { channel: "ui", severity: "info", text: `terminator ${s.terminatorOn ? "ON" : "OFF"}` });
    }
    if (s.graticuleOn !== lastGraticule) {
      lastGraticule = s.graticuleOn;
      adminLog.push("main", { channel: "ui", severity: "info", text: `graticule ${s.graticuleOn ? "ON" : "OFF"}` });
    }
    if (s.countriesOn !== lastCountries) {
      lastCountries = s.countriesOn;
      adminLog.push("main", { channel: "ui", severity: "info", text: `countries ${s.countriesOn ? "ON" : "OFF"}` });
    }
    if (s.citiesOn !== lastCities) {
      lastCities = s.citiesOn;
      adminLog.push("main", { channel: "ui", severity: "info", text: `cities ${s.citiesOn ? "ON" : "OFF"}` });
    }
    if (s.simMultiplier !== lastMultiplier || s.simPaused !== lastPaused) {
      lastMultiplier = s.simMultiplier;
      lastPaused = s.simPaused;
      adminLog.push("main", {
        channel: "clock",
        severity: "info",
        text: `${s.simPaused ? "PAUSED" : `${s.simMultiplier}×`} • sim ${new Date(s.simTimeMs).toISOString().slice(11, 19)}`,
      });
    }
  });

  // -------- Periodic heartbeat with system stats --------
  const heartbeat = setInterval(() => {
    const instruments = getInstruments();
    const cam = instruments?.viewer.camera;
    const camPos = cam?.positionCartographic;
    const altKm = camPos ? camPos.height / 1000 : null;
    adminLog.push("main", {
      channel: "heartbeat",
      severity: "debug",
      text: `alive • cam ${altKm != null ? `${altKm.toFixed(0)}km` : "?"} alt • ${useStore.getState().catalogSize.toLocaleString()} cataloged`,
    });
  }, 4000);

  logSystemInfoOnce();

  return () => {
    cancelAnimationFrame(raf);
    unsub();
    clearInterval(heartbeat);
  };
}

/** One-shot system info dump so /selfdiagnose has something to inspect. */
function logSystemInfoOnce(): void {
  const nav = navigator as Navigator & {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    };
  };
  adminLog.push("main", {
    channel: "sys",
    severity: "info",
    text: `agent: ${nav.userAgent}`,
  });
  adminLog.push("main", {
    channel: "sys",
    severity: "info",
    text: `cores: ${nav.hardwareConcurrency ?? "?"} • deviceMemory: ${
      nav.deviceMemory ?? "?"
    } GB • screen: ${screen.width}×${screen.height}@${window.devicePixelRatio}x`,
  });
  if (nav.connection) {
    adminLog.push("main", {
      channel: "net",
      severity: "info",
      text: `net: ${nav.connection.effectiveType ?? "?"} • ${nav.connection.downlink ?? "?"}Mbps • rtt ${nav.connection.rtt ?? "?"}ms`,
    });
  }
  // GPU info via WebGL.
  const gpu = readGpuInfo();
  if (gpu) {
    adminLog.push("main", {
      channel: "sys",
      severity: "info",
      text: `gpu: ${gpu.renderer} (${gpu.vendor})`,
    });
  }
}

function readGpuInfo(): { renderer: string; vendor: string } | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return null;
    return {
      renderer: gl.getParameter((ext as WEBGL_debug_renderer_info).UNMASKED_RENDERER_WEBGL) as string,
      vendor: gl.getParameter((ext as WEBGL_debug_renderer_info).UNMASKED_VENDOR_WEBGL) as string,
    };
  } catch {
    return null;
  }
}

export function readHeapMb(): number | null {
  const p = performance as unknown as { memory?: { usedJSHeapSize: number } };
  if (!p.memory) return null;
  return Math.round(p.memory.usedJSHeapSize / (1024 * 1024));
}

/** Camera-drive helpers used by /selfdiagnose. */
export function driveCameraOrbit(viewer: Cesium.Viewer, dtSec: number): void {
  // Rotate around Earth's Z axis a bit.
  const speedRadPerSec = 0.15;
  viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, speedRadPerSec * dtSec);
}

export function driveCameraZoom(viewer: Cesium.Viewer, factor: number): void {
  if (factor > 1) viewer.camera.zoomOut(factor * 100_000);
  else viewer.camera.zoomIn(1 / factor * 100_000);
}
