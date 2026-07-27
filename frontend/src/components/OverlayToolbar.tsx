import { useStore } from "../state/store.js";
import { ensureNotificationPermission } from "../simulation/notifications.js";

/** Right-hand icon rail: toggles for ISS cam, sky view, saved list, notifications. */
export function OverlayToolbar() {
  const openOverlays = useStore((s) => s.openOverlays);
  const visualLayers = useStore((s) => s.visualLayers);
  const toggleOverlay = useStore((s) => s.toggleOverlay);
  const toggleVisualLayer = useStore((s) => s.toggleVisualLayer);
  const notifyEnabled = useStore((s) => s.notifyEnabled);
  const setNotifyEnabled = useStore((s) => s.setNotifyEnabled);

  const handleNotify = async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      return;
    }
    const ok = await ensureNotificationPermission();
    setNotifyEnabled(ok);
  };

  const btn = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-md border font-mono text-[11px] transition ${
      active
        ? "border-space-accent bg-space-accent/15 text-space-accent"
        : "border-space-border bg-space-panel/85 text-space-dim hover:text-space-text"
    }`;

  return (
    <div className="pointer-events-auto absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 backdrop-blur">
      <button className={btn(openOverlays.has("leaderboard"))} onClick={() => toggleOverlay("leaderboard")} title="Global closest-pairs leaderboard">
        ⚠
      </button>
      <button className={btn(openOverlays.has("iss"))} onClick={() => toggleOverlay("iss")} title="ISS live camera">
        ISS
      </button>
      <button className={btn(openOverlays.has("sky"))} onClick={() => toggleOverlay("sky")} title="Local sky view">
        SKY
      </button>
      <button className={btn(openOverlays.has("saved"))} onClick={() => toggleOverlay("saved")} title="Saved satellites">
        ★
      </button>
      <button className={btn(visualLayers.has("graticule"))} onClick={() => toggleVisualLayer("graticule")} title="Latitude / longitude grid">
        GRID
      </button>
      <button className={btn(visualLayers.has("labels"))} onClick={() => toggleVisualLayer("labels")} title="Country and city labels">
        MAP
      </button>
      <button className={btn(visualLayers.has("terminator"))} onClick={() => toggleVisualLayer("terminator")} title="Solar terminator line">
        SUN
      </button>
      <button className={btn(notifyEnabled)} onClick={handleNotify} title="Browser notifications">
        🔔
      </button>
    </div>
  );
}
