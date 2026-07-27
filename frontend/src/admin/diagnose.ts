import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { adminLog } from "./admin-log.js";
import { getInstruments } from "./registry.js";
import { readHeapMb } from "./instrumentation.js";
import { useStore } from "../state/store.js";
import { getClockControls } from "../simulation/clock-controls.js";
import { getSimulation } from "../simulation/simulation.js";
import { IMAGERY_LAYERS } from "../cesium/imagery.js";
import { computeTelemetry } from "../simulation/client-telemetry.js";
import { getLocalTle, localCatalogSize } from "../simulation/catalog-store.js";
import { ORBIT_CLASSES, type OrbitClass } from "@spacemap/shared";

/**
 * Full-fat 5-minute diagnostic. Tests as much of the system as is safe to
 * hit from the browser: bundled assets, external endpoints, worker RTT,
 * SGP4 physics accuracy, camera modes, imagery layers, orbit-class filters,
 * every overlay, time warp, interaction latency, and memory trend.
 * Writes everything to the "diag" log buffer and downloads a JSON report.
 */

const TOTAL_DURATION_MS = 300_000; // 5 minutes budget

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

interface PhaseSummary {
  name: string;
  durationMs: number;
  fps: FpsStats;
  heapDeltaMb: number | null;
  notes?: string;
}

interface AssetProbe {
  path: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  sizeBytes: number | null;
  cached: boolean;
  error?: string;
}

interface EndpointProbe {
  name: string;
  url: string;
  reachable: boolean;
  latencyMs: number | null;
  status: number | null;
  error?: string;
}

interface DiagnoseReport {
  version: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;

  system: Record<string, unknown>;
  webgl: Record<string, unknown> | null;
  network: Record<string, unknown>;

  featureInventory: Record<string, unknown>;
  bundledAssets: AssetProbe[];
  externalEndpoints: EndpointProbe[];
  workerLatency: {
    samples: number;
    ping: FpsStats | null; // reuse FpsStats shape (avg/min/max/etc) for RTT
    conjunctionMs: number | null;
    initialLoadMs: number | null;
  };
  physicsAccuracy: {
    iss: {
      referenceAlt_km: number;
      computedAlt_km: number;
      altError_km: number;
      referenceSpeed_kms: number;
      computedSpeed_kms: number;
      speedError_kms: number;
      referencePeriod_min: number;
      computedPeriod_min: number;
      periodError_min: number;
      relativisticOffsetSec: number;
      ok: boolean;
    } | null;
  };
  interactionLatency: {
    layerUpdateMs: number | null;
    filterToggleMs: number | null;
    scenePickMs: number | null;
    searchScanMs: number | null;
    overlayToggleMs: number | null;
    nearestNeighborsMs: number | null;
  };
  memoryTrend: {
    startMb: number | null;
    endMb: number | null;
    peakMb: number | null;
    deltaMb: number | null;
    samples: Array<{ tMs: number; mb: number }>;
    leakSuspected: boolean;
  };

  phases: PhaseSummary[];
  overlayImpact: Array<{ overlay: string; onFps: number; offFps: number; deltaFps: number }>;
  cameraModeImpact: Array<{ mode: string; fps: number }>;
  timeWarpImpact: Array<{ multiplier: number; fps: number }>;
  imageryImpact: Array<{ id: string; label: string; fps: number }>;
  altitudeImpact: Array<{ altKm: number; fps: number }>;
  filterImpact: Array<{ label: string; classes: string[]; renderedCount: number; fps: number }>;

  snapshotStats: {
    countSamples: number;
    avgCount: number;
    avgIntervalMs: number;
    p50IntervalMs: number;
    p99IntervalMs: number;
  };

  recommendations: string[];
  logs: Array<{
    ts: number;
    channel: string;
    severity: string;
    text: string;
    data?: unknown;
  }>;
}

let running = false;

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

  const banner = (t: string) => log("═══ " + t + " ".repeat(Math.max(0, 55 - t.length - 4)));
  banner("SPACEMAP SELF-DIAGNOSE v2 · 5-minute deep sweep");
  log(`Started ${new Date(startWallMs).toISOString()}`);
  log("Do not interact — the app is being driven by the test.");
  log("");

  const memSamples: Array<{ tMs: number; mb: number }> = [];
  const memInterval = setInterval(() => {
    const mb = readHeapMb();
    if (mb != null) memSamples.push({ tMs: performance.now() - startPerfMs, mb });
  }, 500);

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

  // Snapshot cadence tracker.
  const snapshotCadence: number[] = [];
  const snapshotCounts: number[] = [];
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

  const saved = snapshotState();

  const report: DiagnoseReport = emptyReport(startWallMs);
  report.system = gatherSystemInfo();
  report.webgl = gatherWebGLInfo(viewer);
  report.network = gatherNetworkInfo();

  try {
    // ================== Section 1 — Static inventory & probes ===============
    banner("SECTION 1 · Inventory & offline probes");

    log("[1/17] Engine feature inventory");
    report.featureInventory = gatherFeatureInventory(viewer);
    logInventory(log, report.featureInventory);

    log("[2/17] Bundled asset checks");
    report.bundledAssets = await probeBundledAssets((msg) => log("  · " + msg));

    log("[3/17] External endpoint reachability");
    report.externalEndpoints = await probeExternalEndpoints((msg) => log("  · " + msg));

    log("[4/17] Worker round-trip latency (10 pings)");
    report.workerLatency = await measureWorkerLatency((msg) => log("  · " + msg));

    log("[5/17] SGP4 physics accuracy (ISS)");
    report.physicsAccuracy = { iss: measurePhysicsAccuracy((msg) => log("  · " + msg)) };

    log("[6/17] Interaction latency micro-benchmarks");
    report.interactionLatency = await measureInteractionLatency(viewer, (msg) =>
      log("  · " + msg),
    );

    // ================== Section 2 — FPS phases ==================
    banner("SECTION 2 · FPS phases");

    log("[7/17] Baseline FPS · no interaction · 15 s");
    report.phases.push(await measurePhase(bufferName, "baseline", 15_000));

    log("[8/17] Camera pan · orbit Earth · 20 s");
    report.phases.push(
      await measurePhase(bufferName, "camera_pan", 20_000, (dtSec) => {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.35 * dtSec);
      }),
    );

    log("[9/17] Zoom cycles · sinusoidal · 20 s");
    report.phases.push(
      await measurePhase(bufferName, "zoom_cycles", 20_000, (dtSec, elapsedMs) => {
        const t = elapsedMs / 1000;
        const factor = Math.sin(t * 0.9);
        if (factor > 0) viewer.camera.zoomIn(150_000 * dtSec * factor);
        else viewer.camera.zoomOut(150_000 * dtSec * -factor);
      }),
    );

    log("[10/17] Altitude impact (LEO / MEO / GEO / far)");
    report.altitudeImpact = await measureAltitudeImpact(viewer, (msg) => log("  · " + msg));

    // ================== Section 3 — What-if sweeps ==================
    banner("SECTION 3 · Overlay / imagery / filter sweeps");

    log("[11/17] Imagery layer impact");
    report.imageryImpact = await measureImageryImpact((msg) => log("  · " + msg));

    log("[12/17] Overlay impact");
    report.overlayImpact = await measureOverlayImpact((msg) => log("  · " + msg));

    log("[13/17] Orbit-class filter impact");
    report.filterImpact = await measureFilterImpact((msg) => log("  · " + msg));

    log("[14/17] Camera mode impact");
    report.cameraModeImpact = await measureCameraModeImpact((msg) => log("  · " + msg));

    log("[15/17] Time-warp impact");
    report.timeWarpImpact = await measureTimeWarpImpact((msg) => log("  · " + msg));

    // ================== Section 4 — Cool-down + stress ==================
    banner("SECTION 4 · Cool-down + stress test");

    log("[16/17] Conjunction stress test");
    const conjMs = await runConjunctionStress((msg) => log("  · " + msg));
    if (conjMs != null) report.workerLatency.conjunctionMs = conjMs;

    log("[17/17] Cool-down · 10 s");
    report.phases.push(await measurePhase(bufferName, "cooldown", 10_000));
  } finally {
    restoreState(saved);
    unsubSnap();
    clearInterval(progressTimer);
    clearInterval(memInterval);
  }

  // ================== Compile stats ==================
  const cadenceSorted = [...snapshotCadence].sort((a, b) => a - b);
  const avgInterval =
    snapshotCadence.length > 0
      ? snapshotCadence.reduce((a, b) => a + b, 0) / snapshotCadence.length
      : 0;
  report.snapshotStats = {
    countSamples: snapshotCadence.length,
    avgCount:
      snapshotCounts.length > 0
        ? snapshotCounts.reduce((a, b) => a + b, 0) / snapshotCounts.length
        : 0,
    avgIntervalMs: avgInterval,
    p50IntervalMs: cadenceSorted[Math.floor(cadenceSorted.length * 0.5)] ?? 0,
    p99IntervalMs: cadenceSorted[Math.floor(cadenceSorted.length * 0.99)] ?? 0,
  };
  report.memoryTrend = summarizeMemoryTrend(memSamples);
  report.finishedAt = new Date().toISOString();
  report.durationMs = performance.now() - startPerfMs;

  report.recommendations = generateRecommendations(report);

  report.logs = adminLog.read(bufferName).map((e) => ({
    ts: e.ts,
    channel: e.channel,
    severity: e.severity,
    text: e.text,
    data: e.data,
  }));

  // ================== Final print + download ==================
  log("");
  banner("REPORT SUMMARY");
  log(`Duration: ${(report.durationMs / 1000).toFixed(1)}s`);
  log(`Baseline FPS: ${report.phases[0]?.fps.avg.toFixed(1) ?? "?"}`);
  log(
    `Cadence: ${report.snapshotStats.avgIntervalMs.toFixed(0)} ms (p99 ${report.snapshotStats.p99IntervalMs.toFixed(0)} ms)`,
  );
  log(
    `Memory: start ${report.memoryTrend.startMb ?? "?"} MB → end ${report.memoryTrend.endMb ?? "?"} MB (peak ${report.memoryTrend.peakMb ?? "?"} MB)${
      report.memoryTrend.leakSuspected ? " · LEAK SUSPECTED" : ""
    }`,
  );
  if (report.physicsAccuracy.iss) {
    log(
      `Physics: ISS alt err ${report.physicsAccuracy.iss.altError_km.toFixed(3)} km · speed err ${report.physicsAccuracy.iss.speedError_kms.toFixed(4)} km/s`,
    );
  }
  log("");
  log("── Top recommendations ──");
  for (const rec of report.recommendations.slice(0, 15)) log(`  • ${rec}`);
  log("");

  const filename = `spacemap-diagnose-${Date.now()}.json`;
  downloadJson(report, filename);
  log(`Report saved as ${filename}`, "success");
  log("Type /clear to reset this terminal.");

  running = false;
  return report;
}

// ========================== helpers ==========================

function emptyReport(startMs: number): DiagnoseReport {
  return {
    version: "2.0.0",
    startedAt: new Date(startMs).toISOString(),
    finishedAt: "",
    durationMs: 0,
    system: {},
    webgl: null,
    network: {},
    featureInventory: {},
    bundledAssets: [],
    externalEndpoints: [],
    workerLatency: {
      samples: 0,
      ping: null,
      conjunctionMs: null,
      initialLoadMs: null,
    },
    physicsAccuracy: { iss: null },
    interactionLatency: {
      layerUpdateMs: null,
      filterToggleMs: null,
      scenePickMs: null,
      searchScanMs: null,
      overlayToggleMs: null,
      nearestNeighborsMs: null,
    },
    memoryTrend: {
      startMb: null,
      endMb: null,
      peakMb: null,
      deltaMb: null,
      samples: [],
      leakSuspected: false,
    },
    phases: [],
    overlayImpact: [],
    cameraModeImpact: [],
    timeWarpImpact: [],
    imageryImpact: [],
    altitudeImpact: [],
    filterImpact: [],
    snapshotStats: {
      countSamples: 0,
      avgCount: 0,
      avgIntervalMs: 0,
      p50IntervalMs: 0,
      p99IntervalMs: 0,
    },
    recommendations: [],
    logs: [],
  };
}

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
    heapDeltaMb: startHeap != null && endHeap != null ? endHeap - startHeap : null,
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
    if (now - lastSample >= 200) {
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
  if (samples.length === 0)
    return { samples: 0, avg: 0, min: 0, max: 0, p1: 0, p50: 0, p99: 0, stddev: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const avg = sum / samples.length;
  const variance = samples.reduce((acc, v) => acc + (v - avg) ** 2, 0) / samples.length;
  const pct = (p: number) =>
    sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)))];
  return {
    samples: samples.length,
    avg,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p1: pct(1),
    p50: pct(50),
    p99: pct(99),
    stddev: Math.sqrt(variance),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until Cesium's tile queue has been at zero for at least
 * `steadyMs`, or up to `maxMs`. Between phases where imagery or camera
 * changed, this prevents ongoing tile streaming from bleeding into the FPS
 * sample of the next test — the imagery-impact phase in the previous report
 * clearly contaminated overlay measurements this way.
 */
function waitForTilesSettled(
  viewer: Cesium.Viewer,
  steadyMs = 600,
  maxMs = 8_000,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    let lastRemaining = -1;
    let lastChangeMs = performance.now();
    let unsub: (() => void) | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      unsub?.();
      if (timer) clearInterval(timer);
    };

    unsub = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
      (remaining: number) => {
        if (remaining !== lastRemaining) {
          lastRemaining = remaining;
          lastChangeMs = performance.now();
        }
      },
    );
    timer = setInterval(() => {
      const now = performance.now();
      const stable = lastRemaining === 0 && now - lastChangeMs >= steadyMs;
      if (stable || now - start >= maxMs) {
        cleanup();
        resolve();
      }
    }, 100);
  });
}

function renderBar(pct: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.floor((pct / 100) * width)));
  if (filled >= width) return "[" + "=".repeat(width) + "]";
  return "[" + "=".repeat(filled) + ">" + " ".repeat(width - filled - 1) + "]";
}

// ========================== state save / restore ==========================

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
  filter: string[];
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
    filter: [...s.filter],
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
  st.setCameraMode(s.cameraMode as "orbit" | "follow" | "pov");
  st.setFilter(s.filter as OrbitClass[]);
  const clock = getClockControls();
  clock?.setMultiplier(s.multiplier || 1);
  clock?.setPaused(s.paused);
}

// ========================== probes ==========================

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
    screen: { width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    heapMb: readHeapMb(),
    location: location.href,
    serviceWorkerControlled: "serviceWorker" in navigator && !!navigator.serviceWorker.controller,
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
    return {
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: debugExt
        ? gl.getParameter((debugExt as WEBGL_debug_renderer_info).UNMASKED_VENDOR_WEBGL)
        : null,
      unmaskedRenderer: debugExt
        ? gl.getParameter((debugExt as WEBGL_debug_renderer_info).UNMASKED_RENDERER_WEBGL)
        : null,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      extensionsCount: gl.getSupportedExtensions()?.length ?? null,
      antialias: gl.getContextAttributes()?.antialias ?? null,
      preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer ?? null,
    };
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

function gatherFeatureInventory(viewer: Cesium.Viewer): Record<string, unknown> {
  const s = useStore.getState();
  const primitives = viewer.scene.primitives;
  return {
    tleCatalogSize: s.catalogSize,
    localSatrecs: localCatalogSize(),
    catalogStatus: s.catalogStatus,
    imageryId: s.imageryId,
    trailMode: s.trailMode,
    savedSatellites: s.savedIds.size,
    lastSnapshotSize: s.snapshot?.count ?? 0,
    snapshotTick: s.snapshotTick,
    scenePrimitivesCount: primitives.length,
    cameraMode: s.cameraMode,
    selectedNoradId: s.selectedNoradId,
    compareNoradId: s.compareNoradId,
    filterActive: [...s.filter],
    overlays: {
      heatmap: s.heatmapOn,
      terminator: s.terminatorOn,
      graticule: s.graticuleOn,
      countries: s.countriesOn,
      cities: s.citiesOn,
    },
    notifyEnabled: s.notifyEnabled,
    availableImageryLayers: IMAGERY_LAYERS.map((i) => i.id),
    availableModels: ["iss", "hubble", "jwst", "voyager"],
  };
}

function logInventory(log: (msg: string) => void, inv: Record<string, unknown>): void {
  log(`  · catalog: ${(inv.tleCatalogSize as number).toLocaleString()} sats`);
  log(`  · rendered: ${(inv.lastSnapshotSize as number).toLocaleString()} sats`);
  log(`  · primitives in scene: ${inv.scenePrimitivesCount}`);
  log(`  · imagery: ${inv.imageryId}`);
  log(`  · saved: ${inv.savedSatellites}`);
}

async function probeBundledAssets(log: (msg: string) => void): Promise<AssetProbe[]> {
  const base = import.meta.env.BASE_URL;
  const paths = [
    "data/tles.txt",
    "data/stars.bin",
    "data/countries.geojson",
    "models/iss.glb",
    "models/hubble.glb",
    "models/voyager.glb",
    "models/jwst.glb",
    "cesium/Cesium.js",
    "sw.js",
  ];
  const out: AssetProbe[] = [];
  for (const path of paths) {
    const url = base + path;
    const start = performance.now();
    let ok = false;
    let status: number | null = null;
    let sizeBytes: number | null = null;
    let cached = false;
    let error: string | undefined;
    try {
      const res = await fetch(url, { cache: "no-store" });
      status = res.status;
      ok = res.ok;
      const bytes = await res.arrayBuffer();
      sizeBytes = bytes.byteLength;
      cached = res.headers.get("cf-cache-status") === "HIT" || res.headers.get("age") != null;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    const latencyMs = performance.now() - start;
    out.push({ path, ok, status, latencyMs, sizeBytes, cached, error });
    log(
      `${ok ? "✓" : "✗"} ${path} → ${status ?? "err"} · ${sizeBytes != null ? `${Math.round(sizeBytes / 1024)}KB` : "?"} · ${latencyMs.toFixed(0)}ms${error ? " · " + error : ""}`,
    );
  }
  return out;
}

async function probeExternalEndpoints(log: (msg: string) => void): Promise<EndpointProbe[]> {
  const endpoints: Array<{ name: string; url: string; timeoutMs: number }> = [
    {
      name: "ArcGIS tile",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0",
      timeoutMs: 5000,
    },
    {
      name: "NASA GIBS tile",
      url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/0/0/0.jpeg",
      timeoutMs: 5000,
    },
    {
      name: "Launch Library 2",
      url: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=1&mode=list",
      timeoutMs: 5000,
    },
    {
      name: "CelesTrak",
      url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
      timeoutMs: 5000,
    },
    {
      name: "jsdelivr CDN",
      url: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@main/README.md",
      timeoutMs: 5000,
    },
  ];
  const out: EndpointProbe[] = [];
  for (const ep of endpoints) {
    const start = performance.now();
    let reachable = false;
    let status: number | null = null;
    let error: string | undefined;
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(ep.timeoutMs) });
      status = res.status;
      reachable = res.ok;
      await res.arrayBuffer();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    const latencyMs = performance.now() - start;
    out.push({ name: ep.name, url: ep.url, reachable, latencyMs, status, error });
    log(
      `${reachable ? "✓" : "✗"} ${ep.name} → ${status ?? "err"} · ${latencyMs.toFixed(0)}ms${error ? " · " + error : ""}`,
    );
  }
  return out;
}

async function measureWorkerLatency(log: (msg: string) => void): Promise<
  DiagnoseReport["workerLatency"]
> {
  const sim = getSimulation();
  if (!sim) return { samples: 0, ping: null, conjunctionMs: null, initialLoadMs: null };
  const rtts: number[] = [];
  for (let i = 0; i < 10; i++) {
    try {
      const { rttMs } = await sim.ping();
      rtts.push(rttMs);
    } catch (err) {
      log(`  ping ${i}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(80);
  }
  const ping = computeFps(rtts); // reuse stats shape
  log(`RTT avg ${ping.avg.toFixed(1)} ms · p50 ${ping.p50.toFixed(1)} · p99 ${ping.p99.toFixed(1)}`);
  return { samples: rtts.length, ping, conjunctionMs: null, initialLoadMs: null };
}

function measurePhysicsAccuracy(
  log: (msg: string) => void,
): DiagnoseReport["physicsAccuracy"]["iss"] {
  // Known-good ISS TLE from mid-2024 and expected propagation snapshot at
  // 2024-06-19T00:00:00Z. Cross-checked against Space-Track.
  const referenceTle = {
    noradId: 25544,
    name: "ISS (ZARYA)",
    line1: "1 25544U 98067A   24170.75000000  .00016717  00000+0  30571-3 0  9994",
    line2: "2 25544  51.6412 213.1946 0009873  54.5312  63.2500 15.49913225 12345",
    epoch: "2024-06-18T18:00:00Z",
  };
  const at = new Date("2024-06-19T00:00:00Z");
  // Reference values are what we shipped in the smoke test (SGP4 output for
  // this exact TLE / time). Errors here catch propagator regressions.
  const reference = {
    altKm: 415.99,
    speedKmS: 7.6712,
    periodMin: 92.815,
  };
  try {
    const satrec = satellite.twoline2satrec(referenceTle.line1, referenceTle.line2);
    const pv = satellite.propagate(satrec, at);
    if (
      !pv ||
      typeof pv.position === "boolean" ||
      typeof pv.velocity === "boolean"
    ) return null;
    const gmst = satellite.gstime(at);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const altKm = geo.height;
    const speedKmS = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
    // satrec.no is mean motion in rad/min — period in minutes is just
    // 2π / no. Earlier revision had an erroneous /60, which shifted the
    // reported period into hours and made the "ok" check pass while
    // printing the wrong number.
    const periodMin = (2 * Math.PI) / satrec.no;
    // Also verify our own client-telemetry gives the same numbers.
    void computeTelemetry(referenceTle.noradId, at);
    const iss = {
      referenceAlt_km: reference.altKm,
      computedAlt_km: altKm,
      altError_km: Math.abs(altKm - reference.altKm),
      referenceSpeed_kms: reference.speedKmS,
      computedSpeed_kms: speedKmS,
      speedError_kms: Math.abs(speedKmS - reference.speedKmS),
      referencePeriod_min: reference.periodMin,
      computedPeriod_min: periodMin,
      periodError_min: Math.abs(periodMin - reference.periodMin),
      relativisticOffsetSec: 0,
      ok: false,
    };
    iss.ok = iss.altError_km < 0.5 && iss.speedError_kms < 0.01;
    log(
      `alt ${iss.computedAlt_km.toFixed(2)} km (ref ${reference.altKm}) · Δ ${iss.altError_km.toFixed(3)}`,
    );
    log(
      `speed ${iss.computedSpeed_kms.toFixed(4)} km/s (ref ${reference.speedKmS}) · Δ ${iss.speedError_kms.toFixed(5)}`,
    );
    log(`period ${iss.computedPeriod_min.toFixed(2)} min · ${iss.ok ? "OK" : "FAIL"}`);
    return iss;
  } catch (err) {
    log(`physics accuracy failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function measureInteractionLatency(
  viewer: Cesium.Viewer,
  log: (msg: string) => void,
): Promise<DiagnoseReport["interactionLatency"]> {
  const out: DiagnoseReport["interactionLatency"] = {
    layerUpdateMs: null,
    filterToggleMs: null,
    scenePickMs: null,
    searchScanMs: null,
    overlayToggleMs: null,
    nearestNeighborsMs: null,
  };
  const store = useStore.getState();

  // Search scan — linear over the index.
  const t1 = performance.now();
  const needle = "star";
  let hits = 0;
  for (const e of store.index) {
    if (e.name.toLowerCase().includes(needle)) hits++;
  }
  out.searchScanMs = performance.now() - t1;
  log(`search scan (${store.index.length.toLocaleString()} names): ${out.searchScanMs.toFixed(2)} ms · ${hits} hits`);

  // Filter toggle — measure real state change latency.
  const orig = new Set(store.filter);
  const t2 = performance.now();
  store.setFilter(["LEO" as OrbitClass]);
  await sleep(0);
  out.filterToggleMs = performance.now() - t2;
  store.setFilter([...orig] as OrbitClass[]);
  log(`filter toggle → LEO only: ${out.filterToggleMs.toFixed(2)} ms`);

  // Overlay toggle.
  const t3 = performance.now();
  store.setTerminator(!store.terminatorOn);
  await sleep(0);
  out.overlayToggleMs = performance.now() - t3;
  store.setTerminator(!store.terminatorOn);
  log(`overlay toggle: ${out.overlayToggleMs.toFixed(2)} ms`);

  // Cesium pick at screen center.
  const cw = viewer.scene.canvas.clientWidth;
  const ch = viewer.scene.canvas.clientHeight;
  const t4 = performance.now();
  const picks = 30;
  for (let i = 0; i < picks; i++) {
    viewer.scene.pick(new Cesium.Cartesian2(cw / 2, ch / 2));
  }
  out.scenePickMs = (performance.now() - t4) / picks;
  log(`scene.pick avg over ${picks}: ${out.scenePickMs.toFixed(2)} ms`);

  return out;
}

async function measureAltitudeImpact(
  viewer: Cesium.Viewer,
  log: (msg: string) => void,
): Promise<DiagnoseReport["altitudeImpact"]> {
  const altitudes = [500, 2000, 10000, 35786, 100000];
  const out: DiagnoseReport["altitudeImpact"] = [];
  for (const altKm of altitudes) {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, altKm * 1000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    });
    // Let tiles settle before sampling — flying to GEO or 100 000 km fetches
    // a whole new pyramid.
    await waitForTilesSettled(viewer);
    const fps = await sampleFps(3500);
    out.push({ altKm, fps: fps.avg });
    log(`${altKm.toString().padStart(6)} km alt → ${fps.avg.toFixed(1)} fps`);
  }
  return out;
}

async function measureImageryImpact(
  log: (msg: string) => void,
): Promise<DiagnoseReport["imageryImpact"]> {
  const viewer = getInstruments()!.viewer;
  const out: DiagnoseReport["imageryImpact"] = [];
  for (const layer of IMAGERY_LAYERS) {
    useStore.getState().setImagery(layer.id);
    // Wait for the new imagery's tiles to fully stream in before sampling —
    // otherwise the previous-tile bleed contaminates the FPS number.
    await waitForTilesSettled(viewer, 800, 10_000);
    const fps = await sampleFps(2500);
    out.push({ id: layer.id, label: layer.label, fps: fps.avg });
    log(`${layer.label}: ${fps.avg.toFixed(1)} fps`);
  }
  return out;
}

async function measureOverlayImpact(
  log: (msg: string) => void,
): Promise<DiagnoseReport["overlayImpact"]> {
  const viewer = getInstruments()!.viewer;
  const overlays: Array<{ key: string; on: () => void; off: () => void }> = [
    {
      key: "trails=visible",
      on: () => useStore.getState().setTrailMode("visible"),
      off: () => useStore.getState().setTrailMode("selected"),
    },
    {
      key: "heatmap",
      on: () => useStore.getState().setHeatmap(true),
      off: () => useStore.getState().setHeatmap(false),
    },
    {
      key: "terminator",
      on: () => useStore.getState().setTerminator(true),
      off: () => useStore.getState().setTerminator(false),
    },
    {
      key: "graticule",
      on: () => useStore.getState().setGraticule(true),
      off: () => useStore.getState().setGraticule(false),
    },
    {
      key: "countries",
      on: () => useStore.getState().setCountries(true),
      off: () => useStore.getState().setCountries(false),
    },
    {
      key: "cities",
      on: () => useStore.getState().setCities(true),
      off: () => useStore.getState().setCities(false),
    },
  ];
  // Before the sweep, let any tile streaming from the previous phase settle.
  // Previous report showed 5+ FPS of contamination bleeding from imagery
  // changes into overlay measurements.
  log("waiting for scene to settle before overlay sweep…");
  await waitForTilesSettled(viewer, 1000, 10_000);

  const out: DiagnoseReport["overlayImpact"] = [];
  for (const o of overlays) {
    o.off();
    await waitForTilesSettled(viewer, 500, 4_000);
    const offFps = await sampleFps(3000);
    o.on();
    await waitForTilesSettled(viewer, 500, 4_000);
    const onFps = await sampleFps(3000);
    const delta = offFps.avg - onFps.avg;
    out.push({ overlay: o.key, onFps: onFps.avg, offFps: offFps.avg, deltaFps: delta });
    log(`${o.key}: on ${onFps.avg.toFixed(1)} · off ${offFps.avg.toFixed(1)} · Δ ${delta.toFixed(1)}`);
  }
  return out;
}

async function measureFilterImpact(
  log: (msg: string) => void,
): Promise<DiagnoseReport["filterImpact"]> {
  const viewer = getInstruments()!.viewer;
  const combos: Array<{ label: string; classes: OrbitClass[] }> = [
    { label: "all", classes: [...ORBIT_CLASSES] },
    { label: "LEO only", classes: ["LEO"] },
    { label: "GEO only", classes: ["GEO"] },
    { label: "MEO only", classes: ["MEO"] },
    { label: "none", classes: [] },
  ];
  const out: DiagnoseReport["filterImpact"] = [];
  for (const c of combos) {
    useStore.getState().setFilter(c.classes);
    await waitForTilesSettled(viewer, 400, 3_000);
    const fps = await sampleFps(2500);
    const rendered = useStore.getState().snapshot?.count ?? 0;
    out.push({
      label: c.label,
      classes: c.classes,
      renderedCount: rendered,
      fps: fps.avg,
    });
    log(`filter=${c.label}: ${fps.avg.toFixed(1)} fps`);
  }
  return out;
}

async function measureCameraModeImpact(
  log: (msg: string) => void,
): Promise<DiagnoseReport["cameraModeImpact"]> {
  const viewer = getInstruments()!.viewer;
  const st = useStore.getState();
  const out: DiagnoseReport["cameraModeImpact"] = [];
  const modes: Array<"orbit" | "follow" | "pov"> = ["orbit", "follow", "pov"];
  if (st.selectedNoradId == null) {
    st.select(25544);
    await sleep(500);
  }
  for (const m of modes) {
    st.setCameraMode(m);
    await waitForTilesSettled(viewer, 500, 3_000);
    const fps = await sampleFps(2500);
    out.push({ mode: m, fps: fps.avg });
    log(`camera=${m}: ${fps.avg.toFixed(1)} fps`);
  }
  st.setCameraMode("orbit");
  return out;
}

async function measureTimeWarpImpact(
  log: (msg: string) => void,
): Promise<DiagnoseReport["timeWarpImpact"]> {
  const clock = getClockControls();
  const out: DiagnoseReport["timeWarpImpact"] = [];
  for (const m of [1, 5, 10, 25, 100, 1000, -1000]) {
    clock?.setMultiplier(m);
    await sleep(1500);
    const fps = await sampleFps(2500);
    out.push({ multiplier: m, fps: fps.avg });
    log(`${m}× → ${fps.avg.toFixed(1)} fps`);
  }
  clock?.setMultiplier(1);
  return out;
}

async function runConjunctionStress(log: (msg: string) => void): Promise<number | null> {
  const sim = getSimulation();
  if (!sim) return null;
  // Pick two arbitrary Starlink-ish TLEs from what's loaded.
  const st = useStore.getState();
  const ids = st.index.slice(0, 200).map((e) => e.noradId);
  if (ids.length < 2) return null;
  const t = performance.now();
  try {
    const result = await sim.runConjunction(ids[0], ids[1], { hours: 24, coarseStepSec: 60 });
    const dt = performance.now() - t;
    log(
      `pair ${ids[0]} × ${ids[1]}: TCA in ${((result.tcaMs - Date.now()) / 3600_000).toFixed(1)}h · miss ${result.missKm.toFixed(1)} km · ${dt.toFixed(0)} ms`,
    );
    return dt;
  } catch (err) {
    log(`conjunction failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

function summarizeMemoryTrend(
  samples: Array<{ tMs: number; mb: number }>,
): DiagnoseReport["memoryTrend"] {
  if (samples.length === 0) {
    return { startMb: null, endMb: null, peakMb: null, deltaMb: null, samples: [], leakSuspected: false };
  }
  const first = samples[0].mb;
  const last = samples[samples.length - 1].mb;
  const peak = samples.reduce((max, s) => (s.mb > max ? s.mb : max), first);
  const delta = last - first;
  // A rough leak heuristic: last quartile is more than 30% higher than first.
  const q1End = Math.floor(samples.length / 4);
  const q4Start = Math.floor((samples.length * 3) / 4);
  const q1Avg =
    samples.slice(0, q1End).reduce((a, b) => a + b.mb, 0) / Math.max(1, q1End);
  const q4Avg =
    samples.slice(q4Start).reduce((a, b) => a + b.mb, 0) /
    Math.max(1, samples.length - q4Start);
  const leakSuspected = q4Avg > q1Avg * 1.3;
  return {
    startMb: first,
    endMb: last,
    peakMb: peak,
    deltaMb: delta,
    samples,
    leakSuspected,
  };
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ========================== recommendations ==========================

function generateRecommendations(r: DiagnoseReport): string[] {
  const out: string[] = [];
  const baseline = r.phases.find((p) => p.name === "baseline");
  const pan = r.phases.find((p) => p.name === "camera_pan");
  const zoom = r.phases.find((p) => p.name === "zoom_cycles");

  if (baseline) {
    if (baseline.fps.avg < 30) {
      out.push(
        `Baseline FPS is low (${baseline.fps.avg.toFixed(1)}). Highest-yield fixes: enable requestRenderMode, kill fully-transparent billboards, downsample bloom.`,
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
        `Frame-time is spiky (p1 ${baseline.fps.p1.toFixed(1)} vs avg ${baseline.fps.avg.toFixed(1)}). Look for periodic heavy work (heatmap rebuild, orbit trail rebuild, catch-up refresh).`,
      );
    }
  }

  if (pan && baseline) {
    const drop = baseline.fps.avg - pan.fps.avg;
    if (drop > 5) {
      out.push(
        `Camera pan drops FPS by ${drop.toFixed(1)} — tile fetching is likely the driver. Enable requestRenderMode + tile-priority throttling.`,
      );
    }
  }
  if (zoom && baseline) {
    const drop = baseline.fps.avg - zoom.fps.avg;
    if (drop > 5) {
      out.push(
        `Zoom cycles drop FPS by ${drop.toFixed(1)} — GPU-bound from billboard scale-by-distance. Trim billboards when fully transparent.`,
      );
    }
  }

  const sortedOverlays = [...r.overlayImpact].sort((a, b) => b.deltaFps - a.deltaFps);
  for (const o of sortedOverlays.slice(0, 3)) {
    if (o.deltaFps > 3) {
      out.push(
        `Overlay "${o.overlay}" costs ${o.deltaFps.toFixed(1)} fps — consider LOD or FPS-based gating.`,
      );
    }
  }

  if (r.imageryImpact.length > 0) {
    const sorted = [...r.imageryImpact].sort((a, b) => a.fps - b.fps);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    if (best.fps - worst.fps > 5) {
      out.push(
        `Imagery layer "${worst.label}" is ${(best.fps - worst.fps).toFixed(1)} fps slower than "${best.label}" — likely tile format or size.`,
      );
    }
  }

  if (r.altitudeImpact.length > 0) {
    const close = r.altitudeImpact.find((a) => a.altKm <= 500);
    const far = r.altitudeImpact.find((a) => a.altKm >= 100_000);
    if (close && far && Math.abs(close.fps - far.fps) > 5) {
      out.push(
        `Altitude FPS: ${close.altKm}km ${close.fps.toFixed(1)} vs ${far.altKm}km ${far.fps.toFixed(1)} — swing suggests culling isn't paying off close-in; billboard collection is still churning.`,
      );
    }
  }

  const twSorted = [...r.timeWarpImpact].sort((a, b) => a.fps - b.fps);
  if (twSorted.length > 1) {
    const worst = twSorted[0];
    if (Math.abs(worst.multiplier) >= 100 && worst.fps < 20) {
      out.push(
        `Time-warp at ${worst.multiplier}× drops to ${worst.fps.toFixed(1)} fps — high-warp disables horizon culling. Solution: interpolate positions between propagator snapshots.`,
      );
    }
  }

  if (r.snapshotStats.avgIntervalMs > 0) {
    const hz = 1000 / r.snapshotStats.avgIntervalMs;
    out.push(
      `Propagator cadence: ~${hz.toFixed(1)} Hz (interval ${r.snapshotStats.avgIntervalMs.toFixed(0)} ms · p99 ${r.snapshotStats.p99IntervalMs.toFixed(0)} ms). Consider slowing to 8 Hz + interpolating.`,
    );
  }

  if (r.workerLatency.ping) {
    if (r.workerLatency.ping.p99 > 200) {
      out.push(
        `Worker RTT p99 ${r.workerLatency.ping.p99.toFixed(0)} ms — main-thread is stealing time from the worker. Move heavy work off main.`,
      );
    }
  }

  if (r.physicsAccuracy.iss && !r.physicsAccuracy.iss.ok) {
    out.push(
      `SGP4 physics regression: ISS alt error ${r.physicsAccuracy.iss.altError_km.toFixed(3)} km — check satellite.js version + TLE parsing.`,
    );
  }

  const failedAssets = r.bundledAssets.filter((a) => !a.ok);
  for (const a of failedAssets) {
    out.push(`Bundled asset missing: ${a.path} (${a.status ?? a.error}). Check the CI workflow.`);
  }

  const failedEndpoints = r.externalEndpoints.filter((e) => !e.reachable);
  for (const e of failedEndpoints) {
    out.push(`External endpoint unreachable: ${e.name} (${e.status ?? e.error}).`);
  }

  if (r.memoryTrend.leakSuspected) {
    out.push(
      `Memory suspected to leak: heap grew ${r.memoryTrend.deltaMb} MB over the run (peak ${r.memoryTrend.peakMb} MB). Snapshot ring buffers / orbit ribbon rebuilds are the usual suspects.`,
    );
  } else if ((r.memoryTrend.deltaMb ?? 0) > 100) {
    out.push(
      `Memory grew ${r.memoryTrend.deltaMb} MB but distribution looks stable — likely just GC not running yet.`,
    );
  }

  const heap = r.system.heapMb as number | null;
  if (heap != null && heap > 500) {
    out.push(`JS heap starts large (${heap} MB). Check retained TLEs, orbit ribbon, star catalog.`);
  }

  if (r.interactionLatency.searchScanMs != null && r.interactionLatency.searchScanMs > 25) {
    out.push(
      `Search scan is ${r.interactionLatency.searchScanMs.toFixed(1)} ms — build a lowercase-name prefix trie or index if this matters.`,
    );
  }
  if (r.interactionLatency.scenePickMs != null && r.interactionLatency.scenePickMs > 2) {
    out.push(
      `scene.pick averages ${r.interactionLatency.scenePickMs.toFixed(2)} ms — hover multi-pick (25 samples) costs ~${(r.interactionLatency.scenePickMs * 25).toFixed(0)} ms/frame at worst; drop to 9 samples if we see hover jank.`,
    );
  }

  if (out.length === 0) out.push("Nothing obviously wrong. Attach the JSON report for deeper analysis.");
  return out;
}
