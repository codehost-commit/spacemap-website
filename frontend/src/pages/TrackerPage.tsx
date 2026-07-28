import { useEffect } from "react";
import { GlobeCanvas } from "../components/GlobeCanvas.js";
import { HeaderHUD } from "../components/HeaderHUD.js";
import { TelemetryPanel } from "../components/TelemetryPanel.js";
import { FilterPanel } from "../components/FilterPanel.js";
import { SearchBox } from "../components/SearchBox.js";
import { TimeControls } from "../components/TimeControls.js";
import { OverlayToolbar } from "../components/OverlayToolbar.js";
import { IssCamera } from "../components/IssCamera.js";
import { LocalSkyView } from "../components/LocalSkyView.js";
import { SavedList } from "../components/SavedList.js";
import { CatalogStatusBanner } from "../components/CatalogStatusBanner.js";
import { ConjunctionLeaderboard } from "../components/ConjunctionLeaderboard.js";
import { LaunchTracker } from "../components/LaunchTracker.js";
import { AdminConsole } from "../components/AdminConsole.js";
import { TimelineScrubber } from "../components/TimelineScrubber.js";

/** The original SpaceMap tracker app, now mounted at /tracker */
export function TrackerPage() {
  // Lock body scrolling for the fullscreen tracker
  useEffect(() => {
    document.body.classList.add("tracker-mode");
    return () => document.body.classList.remove("tracker-mode");
  }, []);

  return (
    <div className="relative h-full w-full">
      <GlobeCanvas />
      <HeaderHUD />
      <SearchBox />
      <div className="spacemap-right-rail pointer-events-none absolute right-4 top-24 z-20 flex w-[19.25rem] flex-col gap-4">
        <FilterPanel />
        <OverlayToolbar />
      </div>
      <SavedList />
      <TelemetryPanel />
      <LocalSkyView />
      <IssCamera />
      <ConjunctionLeaderboard />
      <LaunchTracker />
      <TimeControls />
      <TimelineScrubber />
      <CatalogStatusBanner />
      <AdminConsole />
    </div>
  );
}
