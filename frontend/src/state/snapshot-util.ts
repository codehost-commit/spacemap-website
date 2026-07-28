import { ORBIT_CLASSES, type OrbitClass, type PropagationSnapshot } from '@spacemap/shared';

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
    orbitClass: ORBIT_CLASSES[snap.orbitClass[i]] ?? 'UNKNOWN',
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
      orbitClass: ORBIT_CLASSES[snap.orbitClass[i]] ?? 'UNKNOWN',
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
export interface ClosestPair {
  aId: number;
  bId: number;
  aClass: OrbitClass;
  bClass: OrbitClass;
  distanceKm: number;
  relSpeedKmS: number;
}

/**
 * Top-K pairs of satellites by current 3-D ECI distance. Uses an altitude-
 * sorted sliding window so we only compare satellites that could plausibly be
 * near each other, cutting the O(N²) cost of a naive scan to something that
 * runs in ~a few hundred ms on 30k objects.
 *
 * `minRelSpeedKmS` filters out co-orbital cluster-mates (Starlink batches,
 * launch shrouds, etc.) which are close but not on collision courses.
 */
export function closestPairs(
  snap: PropagationSnapshot | null,
  k: number,
  altWindowKm = 40,
  minRelSpeedKmS = 0.4,
): ClosestPair[] {
  if (!snap || snap.count < 2) return [];
  const { count, ids, ecefPos, ecefVel, geodetic, orbitClass } = snap;

  // Sort indices by altitude for the sliding-window sweep.
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  const alt = (i: number) => geodetic[i * 3 + 2];
  const orderArr = Array.from(order);
  orderArr.sort((a, b) => alt(a) - alt(b));

  // Max-heap keyed on distance^2 — root is the worst (largest) of our best K.
  const heap: ClosestPair[] = [];
  let worstD2 = Infinity;

  for (let ii = 0; ii < count; ii++) {
    const i = orderArr[ii];
    const altI = alt(i);
    const xi = ecefPos[i * 3];
    const yi = ecefPos[i * 3 + 1];
    const zi = ecefPos[i * 3 + 2];
    const vxi = ecefVel[i * 3];
    const vyi = ecefVel[i * 3 + 1];
    const vzi = ecefVel[i * 3 + 2];

    for (let jj = ii + 1; jj < count; jj++) {
      const j = orderArr[jj];
      if (alt(j) - altI > altWindowKm) break;
      const dx = ecefPos[j * 3] - xi;
      const dy = ecefPos[j * 3 + 1] - yi;
      const dz = ecefPos[j * 3 + 2] - zi;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (heap.length >= k && d2 >= worstD2) continue;
      const dvx = ecefVel[j * 3] - vxi;
      const dvy = ecefVel[j * 3 + 1] - vyi;
      const dvz = ecefVel[j * 3 + 2] - vzi;
      const relSpeed = Math.hypot(dvx, dvy, dvz) / 1000; // m/s → km/s
      if (relSpeed < minRelSpeedKmS) continue;

      const entry: ClosestPair = {
        aId: ids[i],
        bId: ids[j],
        aClass: ORBIT_CLASSES[orbitClass[i]] ?? 'UNKNOWN',
        bClass: ORBIT_CLASSES[orbitClass[j]] ?? 'UNKNOWN',
        distanceKm: Math.sqrt(d2) / 1000,
        relSpeedKmS: relSpeed,
      };
      insertSortedAscending(heap, entry, k);
      worstD2 = heap.length >= k ? (heap[heap.length - 1].distanceKm * 1000) ** 2 : Infinity;
    }
  }
  return heap;
}

function insertSortedAscending(arr: ClosestPair[], entry: ClosestPair, k: number): void {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].distanceKm < entry.distanceKm) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, entry);
  if (arr.length > k) arr.pop();
}

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
    const north = -sinLat * Math.cos(lonR) * dx - sinLat * Math.sin(lonR) * dy + cosLat * dz;
    const up = cosLat * Math.cos(lonR) * dx + cosLat * Math.sin(lonR) * dy + sinLat * dz;
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
