import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.js';
import { getClockControls } from '../simulation/clock-controls.js';

/**
 * Draggable 24-hour timeline running along the very bottom of the screen.
 * Left half is "the past", right half is "the future". A blue handle marks
 * the current sim time; a yellow tick marks real "now". Click or drag the
 * bar to scrub sim time.
 *
 * The window recenters if the sim time drifts more than 4h from the center,
 * so scrubbing forward/backward at high time-warp still keeps context visible.
 */
const WINDOW_MS = 24 * 3600 * 1000;
const RECENTER_THRESHOLD_MS = 4 * 3600 * 1000;

export function TimelineScrubber() {
  const simTimeMs = useStore((s) => s.simTimeMs);
  const [center, setCenter] = useState(() => Date.now());
  const [wallNow, setWallNow] = useState(() => Date.now());
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Wall clock tick for the "now" marker.
  useEffect(() => {
    const id = setInterval(() => setWallNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Recenter when sim time drifts out of view.
  useEffect(() => {
    if (Math.abs(simTimeMs - center) > RECENTER_THRESHOLD_MS) {
      setCenter(simTimeMs);
    }
  }, [simTimeMs, center]);

  const startMs = center - WINDOW_MS / 2;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const simPct = clamp(((simTimeMs - startMs) / WINDOW_MS) * 100);
  const nowPct = clamp(((wallNow - startMs) / WINDOW_MS) * 100);

  const seekTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = startMs + fraction * WINDOW_MS;
    getClockControls()?.jumpTo(new Date(target));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => seekTo(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // Draw 24 hour ticks with heavier ticks every 6h.
  const ticks = [] as { pct: number; major: boolean; label?: string }[];
  for (let h = 0; h <= 24; h++) {
    const ms = startMs + h * 3600 * 1000;
    const pct = clamp(((ms - startMs) / WINDOW_MS) * 100);
    const major = h % 6 === 0;
    const label = major ? new Date(ms).toISOString().slice(11, 16) : undefined;
    ticks.push({ pct, major, label });
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex h-10 items-center gap-2 border-t border-space-border bg-space-panel/90 px-3 font-mono text-[10px] text-space-dim backdrop-blur">
      <button
        onClick={() => {
          setCenter(Date.now());
          getClockControls()?.jumpToNow();
        }}
        className="rounded border border-space-border px-1.5 py-0.5 text-space-text hover:border-space-accent hover:text-space-accent"
        title="Reset scrubber to now"
      >
        ⏱ now
      </button>
      <span className="hidden shrink-0 sm:inline">
        {new Date(startMs).toISOString().slice(0, 16).replace('T', ' ')}
      </span>
      <div
        ref={trackRef}
        onMouseDown={(e) => {
          setDragging(true);
          seekTo(e.clientX);
        }}
        onClick={(e) => seekTo(e.clientX)}
        className="relative h-4 flex-1 cursor-ew-resize overflow-hidden rounded border border-space-border bg-space-bg"
      >
        {ticks.map((t, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 w-px ${t.major ? 'bg-space-border/80' : 'bg-space-border/40'}`}
            style={{ left: `${t.pct}%` }}
          />
        ))}
        {ticks
          .filter((t) => t.label)
          .map((t, i) => (
            <span
              key={`l${i}`}
              className="absolute top-0 text-[8px] leading-tight text-space-dim"
              style={{ left: `${t.pct}%`, transform: 'translate(-50%, -1px)' }}
            >
              {t.label}
            </span>
          ))}
        {/* real "now" marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-space-warn/80"
          style={{ left: `${nowPct}%` }}
          title="wall clock now"
        />
        {/* sim time handle */}
        <div
          className={`absolute top-0 bottom-0 w-1.5 rounded-sm bg-space-accent shadow-[0_0_8px] shadow-space-accent transition-colors ${
            dragging ? 'bg-cyan-200' : ''
          }`}
          style={{ left: `${simPct}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <span className="hidden shrink-0 sm:inline">
        {new Date(startMs + WINDOW_MS).toISOString().slice(0, 16).replace('T', ' ')}
      </span>
      <span className="ml-2 shrink-0 text-space-accent">
        SIM {new Date(simTimeMs).toISOString().slice(11, 19)}Z
      </span>
    </div>
  );
}
