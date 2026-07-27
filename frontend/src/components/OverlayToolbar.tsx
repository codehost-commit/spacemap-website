import { useStore } from "../state/store.js";
import { ensureNotificationPermission } from "../simulation/notifications.js";

/**
 * Right-hand vertical rail of overlay toggles. Each button is a wide pill
 * with an icon + text label so it's discoverable at a glance instead of
 * relying on tooltips no one hovers.
 */
export function OverlayToolbar() {
  const openOverlays = useStore((s) => s.openOverlays);
  const toggleOverlay = useStore((s) => s.toggleOverlay);
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

  return (
    <div className="spacemap-toolbar pointer-events-auto absolute right-4 top-1/2 z-10 flex w-32 -translate-y-1/2 flex-col gap-1.5">
      <ToolbarButton
        icon="⚠"
        label="Risks"
        title="Top pairs currently closest in orbit"
        active={openOverlays.has("leaderboard")}
        onClick={() => toggleOverlay("leaderboard")}
      />
      <ToolbarButton
        icon="🚀"
        label="Launches"
        title="Upcoming rocket launches"
        active={openOverlays.has("launches")}
        onClick={() => toggleOverlay("launches")}
      />
      <ToolbarButton
        icon="📡"
        label="ISS Cam"
        title="Live camera + ISS telemetry"
        active={openOverlays.has("iss")}
        onClick={() => toggleOverlay("iss")}
      />
      <ToolbarButton
        icon="🌐"
        label="Sky view"
        title="What's overhead from your location"
        active={openOverlays.has("sky")}
        onClick={() => toggleOverlay("sky")}
      />
      <ToolbarButton
        icon="★"
        label="Saved"
        title="Your saved satellites"
        active={openOverlays.has("saved")}
        onClick={() => toggleOverlay("saved")}
      />
      <ToolbarButton
        icon="🔔"
        label="Alerts"
        title="Browser notifications for passes & conjunctions"
        active={notifyEnabled}
        onClick={handleNotify}
      />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  title,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-full items-center gap-2 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
        active
          ? "border-space-accent bg-space-accent/15 text-space-accent"
          : "border-space-border bg-space-panel/85 text-space-text hover:border-space-accent/60 hover:text-space-accent"
      }`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
