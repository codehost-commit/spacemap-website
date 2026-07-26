/// <reference lib="webworker" />
import * as satellite from "satellite.js";
import type { ConjunctionResult, Tle } from "@spacemap/shared";
import { ORBIT_CLASS_INDEX, classifyOrbit } from "@spacemap/shared";

/**
 * SGP4 propagator running off the main thread. Handles three requests:
 *   - `load`         — replace the working satrec catalog from TLEs.
 *   - `propagate`    — propagate the whole catalog to a moment and post a
 *                      structure-of-arrays snapshot back (transferable).
 *   - `conjunction`  — coarse-sweep + golden-section-refine closest-approach
 *                      search between two satellites over a time window.
 */

type LoadMsg = { type: "load"; tles: Tle[] };
type PropagateMsg = { type: "propagate"; timeMs: number };
type ConjunctionMsg = {
  type: "conjunction";
  requestId: number;
  aId: number;
  bId: number;
  startMs: number;
  endMs: number;
  coarseStepSec: number;
};
type InMsg = LoadMsg | PropagateMsg | ConjunctionMsg;

interface Record {
  id: number;
  satrec: satellite.SatRec;
}

const records: Record[] = [];
const byId = new Map<number, satellite.SatRec>();

self.onmessage = (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === "load") load(msg.tles);
  else if (msg.type === "propagate") propagate(msg.timeMs);
  else if (msg.type === "conjunction") conjunction(msg);
};

function load(tles: Tle[]): void {
  records.length = 0;
  byId.clear();
  let bad = 0;
  for (const t of tles) {
    try {
      const sr = satellite.twoline2satrec(t.line1, t.line2);
      if (sr.error) {
        bad++;
        continue;
      }
      records.push({ id: t.noradId, satrec: sr });
      byId.set(t.noradId, sr);
    } catch {
      bad++;
    }
  }
  (self as unknown as Worker).postMessage({ type: "loaded", count: records.length, skipped: bad });
}

function propagate(timeMs: number): void {
  const date = new Date(timeMs);
  const gmst = satellite.gstime(date);
  const cosG = Math.cos(gmst);
  const sinG = Math.sin(gmst);

  const cap = records.length;
  const ids = new Int32Array(cap);
  const eciPos = new Float32Array(cap * 3);
  const ecefPos = new Float32Array(cap * 3);
  const ecefVel = new Float32Array(cap * 3);
  const geodetic = new Float32Array(cap * 3);
  const speed = new Float32Array(cap);
  const orbitClass = new Uint8Array(cap);

  let n = 0;
  for (let i = 0; i < cap; i++) {
    const rec = records[i];
    const pv = satellite.propagate(rec.satrec, date);
    if (!pv || typeof pv.position === "boolean" || typeof pv.velocity === "boolean") continue;
    const p = pv.position;
    const v = pv.velocity;
    const geo = satellite.eciToGeodetic(p, gmst);
    const alt = geo.height;
    if (!Number.isFinite(alt) || alt < -100 || alt > 400_000) continue;

    ids[n] = rec.id;
    eciPos[n * 3] = p.x;
    eciPos[n * 3 + 1] = p.y;
    eciPos[n * 3 + 2] = p.z;

    // TEME → ECEF: rotate by -GMST about Z, convert km → m.
    ecefPos[n * 3] = (cosG * p.x + sinG * p.y) * 1000;
    ecefPos[n * 3 + 1] = (-sinG * p.x + cosG * p.y) * 1000;
    ecefPos[n * 3 + 2] = p.z * 1000;

    // Velocity in ECEF: rotate the TEME velocity + subtract Earth-rotation
    // contribution at this radius. Omega_earth ≈ 7.2921159e-5 rad/s.
    const omega = 7.2921159e-5;
    const vxTeme = v.x * 1000;
    const vyTeme = v.y * 1000;
    const vzTeme = v.z * 1000;
    const pxM = p.x * 1000;
    const pyM = p.y * 1000;
    // Rotate the (velocity − Ω × r) vector by -GMST about Z.
    const vxRot = vxTeme + omega * pyM;
    const vyRot = vyTeme - omega * pxM;
    ecefVel[n * 3] = cosG * vxRot + sinG * vyRot;
    ecefVel[n * 3 + 1] = -sinG * vxRot + cosG * vyRot;
    ecefVel[n * 3 + 2] = vzTeme;

    geodetic[n * 3] = (geo.latitude * 180) / Math.PI;
    let lonDeg = (geo.longitude * 180) / Math.PI;
    while (lonDeg > 180) lonDeg -= 360;
    while (lonDeg < -180) lonDeg += 360;
    geodetic[n * 3 + 1] = lonDeg;
    geodetic[n * 3 + 2] = alt;

    speed[n] = Math.hypot(v.x, v.y, v.z);
    orbitClass[n] =
      ORBIT_CLASS_INDEX[
        classifyOrbit(alt, (rec.satrec.inclo * 180) / Math.PI, rec.satrec.ecco)
      ];
    n++;
  }

  const payload = {
    type: "snapshot" as const,
    timeMs,
    count: n,
    ids: ids.buffer,
    eciPos: eciPos.buffer,
    ecefPos: ecefPos.buffer,
    ecefVel: ecefVel.buffer,
    geodetic: geodetic.buffer,
    speed: speed.buffer,
    orbitClass: orbitClass.buffer,
  };
  (self as unknown as Worker).postMessage(payload, [
    payload.ids,
    payload.eciPos,
    payload.ecefPos,
    payload.ecefVel,
    payload.geodetic,
    payload.speed,
    payload.orbitClass,
  ]);
}

function separationKm(
  a: satellite.SatRec,
  b: satellite.SatRec,
  timeMs: number,
): { r: number; vrel: number } | null {
  const d = new Date(timeMs);
  const pa = satellite.propagate(a, d);
  const pb = satellite.propagate(b, d);
  if (
    !pa || !pb ||
    typeof pa.position === "boolean" || typeof pa.velocity === "boolean" ||
    typeof pb.position === "boolean" || typeof pb.velocity === "boolean"
  ) return null;
  const dx = pa.position.x - pb.position.x;
  const dy = pa.position.y - pb.position.y;
  const dz = pa.position.z - pb.position.z;
  const dvx = pa.velocity.x - pb.velocity.x;
  const dvy = pa.velocity.y - pb.velocity.y;
  const dvz = pa.velocity.z - pb.velocity.z;
  return { r: Math.hypot(dx, dy, dz), vrel: Math.hypot(dvx, dvy, dvz) };
}

function conjunction(msg: ConjunctionMsg): void {
  const post = (payload: unknown) =>
    (self as unknown as Worker).postMessage(payload);
  const a = byId.get(msg.aId);
  const b = byId.get(msg.bId);
  if (!a || !b) {
    post({ type: "conjunctionResult", requestId: msg.requestId, error: "unknown satellite" });
    return;
  }

  // Coarse sweep.
  const stepMs = msg.coarseStepSec * 1000;
  let bestT = msg.startMs;
  let bestR = Infinity;
  for (let t = msg.startMs; t <= msg.endMs; t += stepMs) {
    const s = separationKm(a, b, t);
    if (!s) continue;
    if (s.r < bestR) {
      bestR = s.r;
      bestT = t;
    }
  }
  if (!Number.isFinite(bestR)) {
    post({ type: "conjunctionResult", requestId: msg.requestId, error: "propagation failed" });
    return;
  }

  // Golden-section refine within ± one coarse step.
  const refined = goldenMin(
    (t) => separationKm(a, b, t)?.r ?? Infinity,
    Math.max(msg.startMs, bestT - stepMs),
    Math.min(msg.endMs, bestT + stepMs),
    500,
  );

  const atTca = separationKm(a, b, refined.t);
  const now = separationKm(a, b, Date.now());
  if (!atTca) {
    post({ type: "conjunctionResult", requestId: msg.requestId, error: "TCA lookup failed" });
    return;
  }

  const missKm = atTca.r;
  const relSpeedKmS = atTca.vrel;
  const sigmaKm = 0.3; // assumed 300 m combined 1σ positional uncertainty
  // Simple Gaussian collision probability with 20 m combined hard-body radius.
  const hbrKm = 0.02;
  const pc = Math.exp(-(missKm * missKm) / (2 * sigmaKm * sigmaKm)) *
    (1 - Math.exp(-(hbrKm * hbrKm) / (2 * sigmaKm * sigmaKm)));

  // Severity blends miss distance and Pc onto 0–100.
  const distScore = 100 * Math.exp(-missKm / 5); // 5 km e-folding
  const pcScore = Math.min(100, pc * 1e7);
  const severity = Math.min(100, Math.max(distScore, pcScore));

  const result: ConjunctionResult = {
    aId: msg.aId,
    bId: msg.bId,
    tcaMs: refined.t,
    missKm,
    relSpeedKmS,
    currentSepKm: now?.r ?? missKm,
    currentRelSpeedKmS: now?.vrel ?? relSpeedKmS,
    probabilityOfCollision: pc,
    severity,
    windowStartMs: msg.startMs,
    windowEndMs: msg.endMs,
  };
  post({ type: "conjunctionResult", requestId: msg.requestId, result });
}

/** Golden-section minimum of a unimodal-ish function on [a, b], time in ms. */
function goldenMin(
  f: (t: number) => number,
  a: number,
  b: number,
  tolMs: number,
): { t: number; v: number } {
  const gr = (Math.sqrt(5) - 1) / 2;
  let lo = a;
  let hi = b;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  let fc = f(c);
  let fd = f(d);
  while (hi - lo > tolMs) {
    if (fc < fd) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - gr * (hi - lo);
      fc = f(c);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + gr * (hi - lo);
      fd = f(d);
    }
  }
  const t = (lo + hi) / 2;
  return { t, v: f(t) };
}
