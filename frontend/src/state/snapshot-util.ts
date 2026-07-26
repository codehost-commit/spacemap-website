import { ORBIT_CLASSES, type OrbitClass, type PropagationSnapshot } from "@spacemap/shared";

export interface SnapshotRow {
  index: number;
  noradId: number;
  latDeg: number;
  lonDeg: number;
  altKm: number;
  speedKmS: number;
  orbitClass: OrbitClass;
  eci: [number, number, number];
}

export function findInSnapshot(
  snap: PropagationSnapshot | null,
  noradId: number,
): SnapshotRow | null {
  if (!snap) return null;
  for (let i = 0; i < snap.count; i++) {
    if (snap.ids[i] === noradId) return rowAt(snap, i);
  }
  return null;
}

function rowAt(snap: PropagationSnapshot, i: number): SnapshotRow {
  return {
    index: i,
    noradId: snap.ids[i],
    latDeg: snap.geodetic[i * 3],
    lonDeg: snap.geodetic[i * 3 + 1],
    altKm: snap.geodetic[i * 3 + 2],
    speedKmS: snap.speed[i],
    orbitClass: ORBIT_CLASSES[snap.orbitClass[i]] ?? "UNKNOWN",
    eci: [snap.eciPos[i * 3], snap.eciPos[i * 3 + 1], snap.eciPos[i * 3 + 2]],
  };
}

/**
 * Nearest K satellites (by 3-D ECI distance) to a reference satellite in the
 * given snapshot. Returns pairs of {noradId, distanceKm} sorted ascending.
 */
export function nearestNeighbors(
  snap: PropagationSnapshot,
  refNoradId: number,
  k: number,
): Array<{ noradId: number; distanceKm: number; orbitClass: OrbitClass }> {
  const ref = findInSnapshot(snap, refNoradId);
  if (!ref) return [];
  const rx = ref.eci[0];
  const ry = ref.eci[1];
  const rz = ref.eci[2];
  // Partial insertion sort into a small heap-like array.
  const out: Array<{ noradId: number; distanceKm: number; orbitClass: OrbitClass }> = [];
  let worst = Infinity;

  for (let i = 0; i < snap.count; i++) {
    if (snap.ids[i] === refNoradId) continue;
    const dx = snap.eciPos[i * 3] - rx;
    const dy = snap.eciPos[i * 3 + 1] - ry;
    const dz = snap.eciPos[i * 3 + 2] - rz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (out.length >= k && d2 >= worst) continue;
    const d = Math.sqrt(d2);
    const entry = {
      noradId: snap.ids[i],
      distanceKm: d,
      orbitClass: ORBIT_CLASSES[snap.orbitClass[i]] ?? "UNKNOWN",
    };
    // Insert in sorted order.
    let pos = out.length;
    while (pos > 0 && out[pos - 1].distanceKm > d) pos--;
    out.splice(pos, 0, entry);
    if (out.length > k) out.pop();
    worst = out[out.length - 1].distanceKm ** 2;
  }
  return out;
}

/**
 * Topocentric look-angles of every satellite from a fixed observer at
 * (obsLatDeg, obsLonDeg, obsAltKm). Returns those currently above the
 * horizon, sorted by descending elevation.
 */
export function overheadPasses(
  snap: PropagationSnapshot | null,
  obsLatDeg: number,
  obsLonDeg: number,
  obsAltKm: number,
  minElevationDeg = 5,
): Array<{
  noradId: number;
  elevationDeg: number;
  azimuthDeg: number;
  rangeKm: number;
}> {
  if (!snap) return [];
  // Observer position in ECEF metres.
  const latR = (obsLatDeg * Math.PI) / 180;
  const lonR = (obsLonDeg * Math.PI) / 180;
  const a = 6_378_137;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latR);
  const cosLat = Math.cos(latR);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const h = obsAltKm * 1000;
  const obsX = (N + h) * cosLat * Math.cos(lonR);
  const obsY = (N + h) * cosLat * Math.sin(lonR);
  const obsZ = (N * (1 - e2) + h) * sinLat;

  const out: Array<{
    noradId: number;
    elevationDeg: number;
    azimuthDeg: number;
    rangeKm: number;
  }> = [];

  for (let i = 0; i < snap.count; i++) {
    const dx = snap.ecefPos[i * 3] - obsX;
    const dy = snap.ecefPos[i * 3 + 1] - obsY;
    const dz = snap.ecefPos[i * 3 + 2] - obsZ;
    // Rotate ECEF vector into local ENU frame at observer.
    const east = -Math.sin(lonR) * dx + Math.cos(lonR) * dy;
    const north =
      -sinLat * Math.cos(lonR) * dx - sinLat * Math.sin(lonR) * dy + cosLat * dz;
    const up =
      cosLat * Math.cos(lonR) * dx + cosLat * Math.sin(lonR) * dy + sinLat * dz;
    const range = Math.hypot(east, north, up);
    const elevation = Math.asin(up / range);
    const elevDeg = (elevation * 180) / Math.PI;
    if (elevDeg < minElevationDeg) continue;
    let azimuth = Math.atan2(east, north);
    if (azimuth < 0) azimuth += 2 * Math.PI;
    out.push({
      noradId: snap.ids[i],
      elevationDeg: elevDeg,
      azimuthDeg: (azimuth * 180) / Math.PI,
      rangeKm: range / 1000,
    });
  }
  out.sort((x, y) => y.elevationDeg - x.elevationDeg);
  return out;
}
