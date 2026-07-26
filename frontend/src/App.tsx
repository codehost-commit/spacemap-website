import { GlobeCanvas } from "./components/GlobeCanvas.js";
import { HeaderHUD } from "./components/HeaderHUD.js";
import { TelemetryPanel } from "./components/TelemetryPanel.js";
import { FilterPanel } from "./components/FilterPanel.js";
import { SearchBox } from "./components/SearchBox.js";
import { TimeControls } from "./components/TimeControls.js";
import { OverlayToolbar } from "./components/OverlayToolbar.js";
import { IssCamera } from "./components/IssCamera.js";
import { LocalSkyView } from "./components/LocalSkyView.js";
import { SavedList } from "./components/SavedList.js";

export function App() {
  return (
    <div className="relative h-full w-full">
      <GlobeCanvas />
      <HeaderHUD />
      <SearchBox />
      <FilterPanel />
      <SavedList />
      <TelemetryPanel />
      <LocalSkyView />
      <IssCamera />
      <OverlayToolbar />
      <TimeControls />
    </div>
  );
}
