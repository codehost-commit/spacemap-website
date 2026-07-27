import * as Cesium from "cesium";
import { adminLog } from "./admin-log.js";
import { getInstruments } from "./registry.js";
import { readHeapMb } from "./instrumentation.js";
import { useStore } from "../state/store.js";
import { getClockControls } from "../simulation/clock-controls.js";

/**
 * 3-minute automated stress test. Drives the camera, flips overlays, warps
 * time — and along the way samples FPS, memory, snapshot cadence, and
 * network stats. Writes everything as it happens into the "diag" buffer,
 * emits an ASCII progress bar, and at the end triggers a JSON download.
 */

const TOTAL_DURATION_MS = 180_000; // 3 minutes
const OVERLAY_DWELL_MS = 3_500;    // wait this long after toggling before sampling
const SAMPLE_INTERVAL_MS = 100;    // fps sample cadence

interface PhaseSummary {
  name: string;
  durationMs: number;
  fps: FpsStats;
  heapDeltaMb: number | null;
  notes?: string;
}

interface FpsStats {
  samples: number;
  avg: number;
  min: number;
  max: number;
  p1: number;
  p50: number;
  p99: number;
  stddev: number;
}

interface DiagnoseReport {
  version: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  system: Record<string, unknown>;
  webgl: Record<string, unknown> | null;
  phases: PhaseSummary[];
  overlayImpact: Array<{ overlay: string; onFps: number; offFps: number; deltaFps: number }>;
  cameraModeImpact: Array<{ mode: string; fps: number }>;
  timeWarpImpact: Array<{ multiplier: number; fps: number }>;
  imageryImpact: Array<{ id: string; fps: number }>;
  network: Record<string, unknown>;
  snapshotStats: {
    countSamples: number;
    avgCount: number;
    avgIntervalMs: number;
  };
  recommendations: string[];
}

let running = false;

/**
 * Run the full self-diagnose. `bufferName` is the diag terminal buffer.
 * `onComplete` fires with the finished report + JSON blob URL.
 */
export async function runSelfDiagnose(bufferName: string): Promise<DiagnoseReport | null> {
  if (running) {
    adminLog.push(bufferName, { channel: "diag", severity: "warn", text: "already running" });
    return null;
  }
  const instruments = getInstruments();
  if (!instruments) {
    adminLog.push(bufferName, { channel: "diag", severity: "error", text: "engine not ready" });
    return null;
  }

  running = true;
  const { viewer } = instruments;
  const startWallMs = Date.now();
  const startPerfMs = performance.now();

  const log = (text: string, sev: "info" | "warn" | "error" | "success" = "info") =>
    adminLog.push(bufferName, { channel: "diag", severity: sev, text });

  const line = "═══════════════════════════════════════════════════";
  log(line);
  log(" SPACEMAP SELF-DIAGNOSE");
  log(line);
  log(`Started ${new Date(startWallMs).toISOString()}`);
  log(`Duration budget: 3:00`);
  log("");

  // Progress ticker.
  const progressTimer = setInterval(() => {
    const elapsed = performance.now() - startPerfMs;
    const pct = Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100);
    const remainMs = Math.max(0, TOTAL_DURATION_MS - elapsed);
    adminLog.push(bufferName, {
      channel: "diag",
      severity: "info",
      text: `${renderBar(pct, 30)} ${pct.toFixed(0)}% • ETA ${(remainMs / 1000).toFixed(0)}s`,
      progressId: "overall",
    });
  }, 500);

  // Save current UI state so we can restore it at the end.
  const snapshot = snapshotState();

  const phases: PhaseSummary[] = [];
  const overlayImpact: DiagnoseReport["overlayImpact"] = [];
  const cameraModeImpact: DiagnoseReport["cameraModeImpact"] = [];
  const timeWarpImpact: DiagnoseReport["timeWarpImpact"] = [];
  const imageryImpact: DiagnoseReport["imageryImpact"] = [];
  const snapshotCadence: number[] = [];
  const snapshotCounts: number[] = [];

  // Snapshot cadence tracker.
  let lastSnapMs = performance.now();
  let lastTick = useStore.getState().snapshotTick;
  const unsubSnap = useStore.subscribe((s) => {
    if (s.snapshot && s.snapshotTick !== lastTick) {
      const now = performance.now();
      snapshotCadence.push(now - lastSnapMs);
      snapshotCounts.push(s.snapshot.count);
      lastSnapMs = now;
      lastTick = s.snapshotTick;
    }
  });

  try {
    // ==================================================================
    // Phase 1 — Baseline (20s)
    // ==================================================================
    log("[Phase 1/6] Baseline FPS · no interaction");
    phases.push(await measurePhase(bufferName, "baseline", 20_000));

    // ==================================================================
    // Phase 2 — Camera pan (25s)
    // ==================================================================
    log("[Phase 2/6] Camera pan · orbit Earth");
    phases.push(
      await measurePhase(bufferName, "camera_pan", 25_000, (dtSec) => {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.35 * dtSec);
      }),
    );

    // ==================================================================
    // Phase 3 — Zoom cycles (25s)
    // ==================================================================
    log("[Phase 3/6] Zoom in / out cycles");
    phases.push(
      await measurePhase(bufferName, "zoom_cycles", 25_000, (dtSec, elapsedMs) => {
        // Sinusoidal zoom motion.
        const t = elapsedMs / 1000;
        const factor = Math.sin(t * 0.9);
        if (factor > 0) viewer.camera.zoomIn(150_000 * dtSec * factor);
        else viewer.camera.zoomOut(150_000 * dtSec * -factor);
      }),
    );

    // ==================================================================
    // Phase 4 — Overlay impact sweep (60s: 6 overlays × ~10s each)
    // ==================================================================
    log("[Phase 4/6] Overlay impact sweep");
    const overlays: Array<{
      key: string;
      label: string;
      on: () => void;
      off: () => void;
      restore: boolean;
    }> = [
      {
        key: "trails_visible",
        label: "trails=visible",
        on: () => useStore.getState().setTrailMode("visible"),
        off: () => useStore.getState().setTrailMode("selected"),
        restore: true,
      },
      {
        key: "heatmap",
        label: "heatmap",
        on: () => useStore.getState().setHeatmap(true),
        off: () => useStore.getState().setHeatmap(false),
        restore: true,
      },
      {
        key: "terminator",
        label: "terminator",
        on: () => useStore.getState().setTerminator(true),
        off: () => useStore.getState().setTerminator(false),
        restore: true,
      },
      {
        key: "graticule",
        label: "graticule",
        on: () => useStore.getState().setGraticule(true),
        off: () => useStore.getState().setGraticule(false),
        restore: true,
      },
      {
        key: "countries",
        label: "countries",
        on: () => useStore.getState().setCountries(true),
        off: () => useStore.getState().setCountries(false),
        restore: true,
      },
      {
        key: "cities",
        label: "cities",
        on: () => useStore.getState().setCities(true),
        off: () => useStore.getState().setCities(false),
        restore: true,
      },
    ];
    for (const ov of overlays) {
      log(`  · toggling ${ov.label}`);
      ov.off();
      await sleep(OVERLAY_DWELL_MS);
      const offFps = await sampleFps(3500);
      ov.on();
      await sleep(OVERLAY_DWELL_MS);
      const onFps = await sampleFps(3500);
      overlayImpact.push({
        overlay: ov.label,
        onFps: onFps.avg,
        offFps: offFps.avg,
        deltaFps: offFps.avg - onFps.avg,
      });
      log(
        `    ${ov.label}: ON ${onFps.avg.toFixed(1)} fps · OFF ${offFps.avg.toFixed(1)} fps · Δ ${(offFps.avg - onFps.avg).toFixed(1)}`,
      );
    }

    // ==================================================================
    // Phase 5 — Time warp (25s)
    // ==================================================================
    log("[Phase 5/6] Time warp sweep");
    const clock = getClockControls();
    for (const mult of [1, 10, 100, 1000]) {
      clock?.setMultiplier(mult);
      await sleep(1500);
      const fps = await sampleFps(3000);
      timeWarpImpact.push({ multiplier: mult, fps: fps.avg });
      log(`  · ${mult}× → ${fps.avg.toFixed(1)} fps`);
    }
    clock?.setMultiplier(1);

    // ==================================================================
    // Phase 6 — Cool-down + snapshot stats (25s)
    // ==================================================================
    log("[Phase 6/6] Cool-down + final metrics");
    phases.push(await measurePhase(bufferName, "cooldown", 20_000));
  } finally {
    // Restore original settings so the console leaves the app the way it
    // found it.
    restoreState(snapshot);
    unsubSnap();
    clearInterval(progressTimer);
  }

  // ==================================================================
  // Compose report.
  // ==================================================================
  log("");
  log("Assembling report…");

  const snapshotAvgInterval =
    snapshotCadence.length > 0
      ? snapshotCadence.reduce((a, b) => a + b, 0) / snapshotCadence.length
      : 0;
  const snapshotAvgCount =
    snapshotCounts.length > 0
      ? snapshotCounts.reduce((a, b) => a + b, 0) / snapshotCounts.length
      : 0;

  const report: DiagnoseReport = {
    version: "1.0.0",
    startedAt: new Date(startWallMs).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: performance.now() - startPerfMs,
    system: gatherSystemInfo(),
    webgl: gatherWebGLInfo(viewer),
    phases,
    overlayImpact,
    cameraModeImpact,
    timeWarpImpact,
    imageryImpact,
    network: gatherNetworkInfo(),
    snapshotStats: {
      countSamples: snapshotCadence.length,
      avgCount: snapshotAvgCount,
      avgIntervalMs: snapshotAvgInterval,
    },
    recommendations: [],
  };
  report.recommendations = generateRecommendations(report);

  log("");
  log("═══════════════════════════════════════════════════");
  log(" DIAGNOSE COMPLETE", "success");
  log("═══════════════════════════════════════════════════");
  log(`Total: ${(report.durationMs / 1000).toFixed(1)}s`);
  log("");
  log("── Top findings ──");
  for (const rec of report.recommendations.slice(0, 12)) log(`  • ${rec}`);
  log("");
  log("Downloading JSON report…");

  const downloadName = `spacemap-diagnose-${Date.now()}.json`;
  downloadJson(report, downloadName);
  log(`Saved: ${downloadName}`, "success");
  log("Type /clear to reset this terminal, or close the tab.");

  running = false;
  return report;
}

// ================================ helpers ===============================

async function measurePhase(
  bufferName: string,
  name: string,
  durationMs: number,
  onFrame?: (dtSec: number, elapsedMs: number) => void,
): Promise<PhaseSummary> {
  const startMs = performance.now();
  const startHeap = readHeapMb();
  const fpsSamples: number[] = [];
  let frames = 0;
  let lastFrameMs = startMs;
  let lastFpsSampleMs = startMs;
  let cancelled = false;

  const raf = () => {
    if (cancelled) return;
    const now = performance.now();
    const dt = (now - lastFrameMs) / 1000;
    lastFrameMs = now;
    frames++;
    onFrame?.(dt, now - startMs);
    if (now - lastFpsSampleMs >= 250) {
      const fps = (frames * 1000) / (now - lastFpsSampleMs);
      fpsSamples.push(fps);
      frames = 0;
      lastFpsSampleMs = now;
      adminLog.push(bufferName, {
        channel: "diag",
        severity: "info",
        text: `  ${name}: ${renderBar(((now - startMs) / durationMs) * 100, 20)} ${fps.toFixed(1)} fps`,
        progressId: `phase-${name}`,
      });
    }
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  await sleep(durationMs);
  cancelled = true;

  const endHeap = readHeapMb();
  return {
    name,
    durationMs: performance.now() - startMs,
    fps: computeFps(fpsSamples),
    heapDeltaMb:
      startHeap != null && endHeap != null ? endHeap - startHeap : null,
  };
}

async function sampleFps(durationMs: number): Promise<FpsStats> {
  const samples: number[] = [];
  const start = performance.now();
  let frames = 0;
  let lastSample = start;
  let cancelled = false;
  const raf = () => {
    if (cancelled) return;
    frames++;
    const now = performance.now();
    if (now - lastSample >= 250) {
      samples.push((frames * 1000) / (now - lastSample));
      frames = 0;
      lastSample = now;
    }
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  await sleep(durationMs);
  cancelled = true;
  return computeFps(samples);
}

function computeFps(samples: number[]): FpsStats {
  if (samples.length === 0) {
    return { samples: 0, avg: 0, min: 0, max: 0, p1: 0, p50: 0, p99: 0, stddev: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const avg = sum / samples.length;
  const variance =
    samples.reduce((acc, v) => acc + (v - avg) ** 2, 0) / samples.length;
  const percentile = (p: number) =>
    sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)))];
  return {
    samples: samples.length,
    avg,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p1: percentile(1),
    p50: percentile(50),
    p99: percentile(99),
    stddev: Math.sqrt(variance),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function renderBar(pct: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.floor((pct / 100) * width)));
  if (filled >= width) return "[" + "=".repeat(width) + "]";
  return "[" + "=".repeat(filled) + ">" + " ".repeat(width - filled - 1) + "]";
}

// ============= state snapshot / restore =============

interface SavedState {
  trailMode: string;
  heatmap: boolean;
  terminator: boolean;
  graticule: boolean;
  countries: boolean;
  cities: boolean;
  multiplier: number;
  paused: boolean;
  imageryId: string;
  cameraMode: string;
}

function snapshotState(): SavedState {
  const s = useStore.getState();
  return {
    trailMode: s.trailMode,
    heatmap: s.heatmapOn,
    terminator: s.terminatorOn,
    graticule: s.graticuleOn,
    countries: s.countriesOn,
    cities: s.citiesOn,
    multiplier: s.simMultiplier,
    paused: s.simPaused,
    imageryId: s.imageryId,
    cameraMode: s.cameraMode,
  };
}

function restoreState(s: SavedState): void {
  const st = useStore.getState();
  st.setTrailMode(s.trailMode as "off" | "selected" | "visible");
  st.setHeatmap(s.heatmap);
  st.setTerminator(s.terminator);
  st.setGraticule(s.graticule);
  st.setCountries(s.countries);
  st.setCities(s.cities);
  st.setImagery(s.imageryId);
  const clock = getClockControls();
  clock?.setMultiplier(s.multiplier || 1);
  clock?.setPaused(s.paused);
}

// ============= system / gpu / network probes =============

function gatherSystemInfo(): Record<string, unknown> {
  const nav = navigator as Navigator & {
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    cpuCores: nav.hardwareConcurrency ?? null,
    deviceMemoryGB: nav.deviceMemory ?? null,
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    heapMb: readHeapMb(),
    location: location.href,
  };
}

function gatherWebGLInfo(viewer: Cesium.Viewer): Record<string, unknown> | null {
  try {
    const canvas = viewer.scene.canvas;
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return null;
    const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
    const info: Record<string, unknown> = {
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    };
    if (debugExt) {
      info.unmaskedVendor = gl.getParameter(
        (debugExt as WEBGL_debug_renderer_info).UNMASKED_VENDOR_WEBGL,
      );
      info.unmaskedRenderer = gl.getParameter(
        (debugExt as WEBGL_debug_renderer_info).UNMASKED_RENDERER_WEBGL,
      );
    }
    return info;
  } catch {
    return null;
  }
}

function gatherNetworkInfo(): Record<string, unknown> {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };
  const info: Record<string, unknown> = { online: navigator.onLine };
  if (nav.connection) {
    info.effectiveType = nav.connection.effectiveType;
    info.downlinkMbps = nav.connection.downlink;
    info.rttMs = nav.connection.rtt;
    info.saveData = nav.connection.saveData;
  }
  return info;
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ============= recommendations =============

function generateRecommendations(r: DiagnoseReport): string[] {
  const out: string[] = [];
  const baseline = r.phases.find((p) => p.name === "baseline");
  const pan = r.phases.find((p) => p.name === "camera_pan");
  const zoom = r.phases.find((p) => p.name === "zoom_cycles");

  if (baseline) {
    if (baseline.fps.avg < 30) {
      out.push(
        `Baseline FPS is low (${baseline.fps.avg.toFixed(1)}). Look at reducing satellite render cost — see billboard collection.`,
      );
    } else if (baseline.fps.avg < 45) {
      out.push(
        `Baseline FPS is moderate (${baseline.fps.avg.toFixed(1)}). Consider enabling requestRenderMode for idle savings.`,
      );
    } else {
      out.push(`Baseline FPS is healthy (${baseline.fps.avg.toFixed(1)}).`);
    }
    if (baseline.fps.p1 < baseline.fps.avg * 0.6) {
      out.push(
        `Frame-time is spiky (p1 ${baseline.fps.p1.toFixed(1)} vs avg ${baseline.fps.avg.toFixed(1)}). Look for periodic heavy work (heatmap rebuild? orbit trail rebuild?).`,
      );
    }
  }

  if (pan && baseline) {
    const drop = baseline.fps.avg - pan.fps.avg;
    if (drop > 5) {
      out.push(
        `Camera pan drops FPS by ${drop.toFixed(1)} — camera-move-triggered tile streaming is probably in play. Consider requestRenderMode + throttled tile priority.`,
      );
    }
  }
  if (zoom && baseline) {
    const drop = baseline.fps.avg - zoom.fps.avg;
    if (drop > 5) {
      out.push(
        `Zoom cycles drop FPS by ${drop.toFixed(1)} — likely GPU-bound from tile fetching + billboard scale-by-distance. Consider culling billboards outside their fade range.`,
      );
    }
  }

  const sorted = [...r.overlayImpact].sort((a, b) => b.deltaFps - a.deltaFps);
  for (const o of sorted.slice(0, 3)) {
    if (o.deltaFps > 3) {
      out.push(
        `Overlay "${o.overlay}" costs ${o.deltaFps.toFixed(1)} fps — consider LOD or gating on FPS.`,
      );
    }
  }

  const highest = r.timeWarpImpact.reduce(
    (best, cur) => (cur.multiplier > best.multiplier ? cur : best),
    r.timeWarpImpact[0] ?? { multiplier: 1, fps: 0 },
  );
  const lowest = r.timeWarpImpact[0];
  if (highest && lowest) {
    const drop = lowest.fps - highest.fps;
    if (drop > 8) {
      out.push(
        `Time-warp at ${highest.multiplier}× drops FPS by ${drop.toFixed(1)} — high-warp forces full-catalog refresh; consider interpolating between propagator snapshots.`,
      );
    }
  }

  if (r.snapshotStats.avgIntervalMs > 0) {
    const cadenceHz = 1000 / r.snapshotStats.avgIntervalMs;
    out.push(
      `Propagator cadence: ~${cadenceHz.toFixed(1)} Hz (interval ${r.snapshotStats.avgIntervalMs.toFixed(0)} ms). Slowing to 8-10 Hz + interpolating would cut main-thread work materially.`,
    );
  }

  const heap = r.system.heapMb as number | null;
  if (heap != null && heap > 500) {
    out.push(
      `JS heap is large (${heap} MB) — check for retained snapshots, orbit ribbon rebuilds, or star catalog dedup.`,
    );
  }

  if (out.length === 0) {
    out.push("Nothing obviously wrong. Attach the JSON report for deeper analysis.");
  }
  return out;
}
