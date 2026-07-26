import * as Cesium from "cesium";

/**
 * Small handle exposing Cesium.Clock mutations without dragging the entire
 * viewer through React. Set by GlobeCanvas via installClockControls; consumed
 * by the TimeControls component.
 */
export interface ClockControls {
  setMultiplier: (m: number) => void;
  setPaused: (p: boolean) => void;
  step: (dtSec: number) => void;
  jumpToNow: () => void;
  jumpTo: (date: Date) => void;
}

let installed: ClockControls | null = null;

export function installClockControls(viewer: Cesium.Viewer): () => void {
  const clock = viewer.clock;
  const controls: ClockControls = {
    setMultiplier: (m) => {
      clock.multiplier = m;
      if (m !== 0) clock.shouldAnimate = true;
    },
    setPaused: (p) => {
      clock.shouldAnimate = !p;
    },
    step: (dtSec) => {
      clock.currentTime = Cesium.JulianDate.addSeconds(
        clock.currentTime,
        dtSec,
        new Cesium.JulianDate(),
      );
    },
    jumpToNow: () => {
      clock.currentTime = Cesium.JulianDate.fromDate(new Date());
      clock.multiplier = 1;
      clock.shouldAnimate = true;
    },
    jumpTo: (date) => {
      clock.currentTime = Cesium.JulianDate.fromDate(date);
    },
  };
  installed = controls;
  return () => {
    if (installed === controls) installed = null;
  };
}

export function getClockControls(): ClockControls | null {
  return installed;
}
