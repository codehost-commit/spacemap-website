import type { PropagationSnapshot } from "@spacemap/shared";
import { useStore } from "../state/store.js";
import { findInSnapshot, overheadPasses } from "../state/snapshot-util.js";

const ISS_NORAD = 25544;
const COOLDOWN_MS = 15 * 60 * 1000; // don't re-alert the same event within 15 min
const CONJ_CHECK_MS = 20_000;

const lastFiredAt = new Map<string, number>();

function fire(key: string, title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const now = Date.now();
  const prev = lastFiredAt.get(key) ?? 0;
  if (now - prev < COOLDOWN_MS) return;
  lastFiredAt.set(key, now);
  try {
    new Notification(title, { body, tag: key, icon: "/favicon.ico" });
  } catch {
    /* browsers with strict notification policies may throw */
  }
}

/** Ask the user for permission if they haven't answered yet. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

/**
 * Install a listener that watches snapshots for alert-worthy events.
 * Returns an unsubscribe.
 */
export function installNotificationWatcher(): () => void {
  let lastConjunctionCheck = 0;
  let observer: { latDeg: number; lonDeg: number; altKm: number } | null = null;

  // Best-effort geolocation for ISS-overhead alerts. If the user denies, we
  // silently skip those alerts.
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        observer = {
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude ?? 0) / 1000,
        };
      },
      () => {
        observer = null;
      },
      { maximumAge: 3_600_000, timeout: 5000 },
    );
  }

  return useStore.subscribe((s) => {
    if (!s.notifyEnabled || !s.snapshot) return;
    const snap = s.snapshot;

    // ISS pass alert.
    if (observer) {
      const passes = overheadPasses(
        snap,
        observer.latDeg,
        observer.lonDeg,
        observer.altKm,
        10,
      ).filter((p) => p.noradId === ISS_NORAD);
      if (passes.length > 0) {
        fire(
          "iss-pass",
          "ISS overhead",
          `Elevation ${passes[0].elevationDeg.toFixed(0)}°, azimuth ${passes[0].azimuthDeg.toFixed(0)}°`,
        );
      }
    }

    // Saved-satellite pass alerts.
    if (observer) {
      const overhead = overheadPasses(
        snap,
        observer.latDeg,
        observer.lonDeg,
        observer.altKm,
        20,
      );
      for (const p of overhead) {
        if (!s.savedIds.has(p.noradId)) continue;
        const name = s.indexByNorad.get(p.noradId) ?? `#${p.noradId}`;
        fire(
          `saved-${p.noradId}`,
          `${name} overhead`,
          `Elevation ${p.elevationDeg.toFixed(0)}°`,
        );
      }
    }

    // Close-conjunction alert for the currently selected pair.
    const nowMs = Date.now();
    if (
      s.conjunction &&
      s.selectedNoradId != null &&
      s.compareNoradId != null &&
      nowMs - lastConjunctionCheck > CONJ_CHECK_MS
    ) {
      lastConjunctionCheck = nowMs;
      if (s.conjunction.severity >= 60) {
        const aName = s.indexByNorad.get(s.selectedNoradId) ?? `#${s.selectedNoradId}`;
        const bName = s.indexByNorad.get(s.compareNoradId) ?? `#${s.compareNoradId}`;
        fire(
          `conj-${s.conjunction.aId}-${s.conjunction.bId}`,
          "Close conjunction",
          `${aName} vs ${bName}: miss ${s.conjunction.missKm.toFixed(2)} km`,
        );
      }
    }
    void snap; // silence unused when the eslint rule reappears
    void currentIssPos; // keep tree-shakeable helper reachable
  });
}

/** Utility export in case future features want to know where ISS is right now. */
export function currentIssPos(snap: PropagationSnapshot | null) {
  return findInSnapshot(snap, ISS_NORAD);
}
