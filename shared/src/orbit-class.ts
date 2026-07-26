import type { OrbitClass } from "./types/satellite.js";

/** All classes in stable index order — safe to transfer as a Uint8Array. */
export const ORBIT_CLASSES: readonly OrbitClass[] = [
  "LEO",
  "MEO",
  "GEO",
  "HEO",
  "POLAR",
  "SSO",
  "UNKNOWN",
] as const;

export const ORBIT_CLASS_INDEX: Readonly<Record<OrbitClass, number>> = Object.freeze(
  Object.fromEntries(ORBIT_CLASSES.map((c, i) => [c, i])) as Record<OrbitClass, number>,
);

/**
 * Classify an orbit from altitude + inclination. Rough but sufficient for
 * coloring trails; a full classifier can be swapped in later.
 */
export function classifyOrbit(altKm: number, inclinationDeg: number, eccentricity: number): OrbitClass {
  if (eccentricity > 0.25) return "HEO";
  if (inclinationDeg > 80 && inclinationDeg < 100) {
    // Sun-sync sits near 98°; treat the rest of the polar band as POLAR.
    if (inclinationDeg >= 96 && inclinationDeg <= 100 && altKm < 1500) return "SSO";
    return "POLAR";
  }
  if (altKm < 2000) return "LEO";
  if (altKm < 35000) return "MEO";
  if (altKm >= 35000 && altKm <= 36500) return "GEO";
  return "MEO";
}

/** Trail hex color per orbit class. Matches the spec. */
export const ORBIT_CLASS_COLOR: Record<OrbitClass, string> = {
  LEO: "#ff3d3d",
  MEO: "#3d7bff",
  GEO: "#3dff7b",
  HEO: "#a63dff",
  POLAR: "#ffffff",
  SSO: "#ff9a3d",
  UNKNOWN: "#8899aa",
};
