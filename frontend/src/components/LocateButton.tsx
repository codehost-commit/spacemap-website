import { useState } from "react";

type Status = "idle" | "locating" | "denied" | "unavailable" | "error";

/**
 * "Take me to my location" button. Sits inline with the header HUD. Requests
 * browser geolocation and flies the camera to a low-altitude perch directly
 * above the user's lat/lon so they can zoom out from there.
 */
export function LocateButton() {
  const [status, setStatus] = useState<Status>("idle");

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const w = window as unknown as {
          spacemapFocusLatLon?: (lat: number, lon: number, altKm?: number) => void;
        };
        w.spacemapFocusLatLon?.(pos.coords.latitude, pos.coords.longitude, 1500);
        setStatus("idle");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setTimeout(() => setStatus("idle"), 3000);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  };

  const label =
    status === "locating"
      ? "Locating…"
      : status === "denied"
        ? "Permission denied"
        : status === "unavailable"
          ? "Not available"
          : status === "error"
            ? "Location error"
            : "Locate me";

  return (
    <button
      onClick={locate}
      className="flex w-full items-center justify-center gap-1.5 rounded border border-space-border px-2 py-1 font-mono text-[11px] text-space-text hover:border-space-accent hover:text-space-accent"
      title="Fly camera to your current location"
      disabled={status === "locating"}
    >
      <span aria-hidden>📍</span>
      <span>{label}</span>
    </button>
  );
}
