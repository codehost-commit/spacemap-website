import type * as Cesium from "cesium";
import type { SatelliteLayer } from "../cesium/satellite-layer.js";
import type { Simulation } from "../simulation/simulation.js";
import type { ClockControls } from "../simulation/clock-controls.js";

/**
 * Shared references so the AdminConsole (and its /selfdiagnose driver) can
 * inspect and drive the running engine without prop-drilling. Populated once
 * when GlobeCanvas mounts and cleared on unmount.
 */
export interface Instruments {
  viewer: Cesium.Viewer;
  layer: SatelliteLayer;
  sim: Simulation;
  clock: ClockControls;
}

let instruments: Instruments | null = null;

export function registerInstruments(i: Instruments): () => void {
  instruments = i;
  return () => {
    if (instruments === i) instruments = null;
  };
}

export function getInstruments(): Instruments | null {
  return instruments;
}
