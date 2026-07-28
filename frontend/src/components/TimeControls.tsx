import { useState } from 'react';
import { useStore } from '../state/store.js';
import { getClockControls } from '../simulation/clock-controls.js';

const SPEEDS = [1, 5, 10, 25, 100, 1000];

export function TimeControls() {
  const simTimeMs = useStore((s) => s.simTimeMs);
  const multiplier = useStore((s) => s.simMultiplier);
  const paused = useStore((s) => s.simPaused);
  const [showJump, setShowJump] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  const set = (m: number) => getClockControls()?.setMultiplier(m);
  const togglePlay = () => getClockControls()?.setPaused(!paused);
  const reverse = () => getClockControls()?.setMultiplier(-Math.abs(multiplier || 1));
  const now = () => getClockControls()?.jumpToNow();

  const jump = () => {
    const parsed = new Date(jumpValue);
    if (!isNaN(parsed.getTime())) {
      getClockControls()?.jumpTo(parsed);
      setShowJump(false);
    }
  };

  const activeSpeed = Math.abs(multiplier);
  const isReversed = multiplier < 0;

  return (
    <div className="spacemap-timecontrols pointer-events-auto absolute inset-x-0 bottom-14 z-10 mx-auto flex w-fit items-center gap-2 rounded-md border border-space-border bg-space-panel/90 px-3 py-2 font-mono text-xs backdrop-blur">
      <button
        onClick={togglePlay}
        className="rounded border border-space-border px-2 py-1 text-space-text hover:border-space-accent"
        title={paused ? 'Play' : 'Pause'}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <button
        onClick={reverse}
        className={`rounded border px-2 py-1 hover:border-space-accent ${
          isReversed
            ? 'border-space-accent text-space-accent'
            : 'border-space-border text-space-text'
        }`}
        title="Reverse"
      >
        ⇄
      </button>
      <div className="mx-1 h-4 w-px bg-space-border" />
      {SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => set(isReversed ? -s : s)}
          className={`rounded border px-2 py-1 hover:border-space-accent ${
            activeSpeed === s
              ? 'border-space-accent bg-space-accent/10 text-space-accent'
              : 'border-space-border text-space-text'
          }`}
        >
          {s}×
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-space-border" />
      <button
        onClick={now}
        className="rounded border border-space-border px-2 py-1 hover:border-space-accent"
      >
        Now
      </button>
      <button
        onClick={() => {
          setShowJump((v) => !v);
          if (!showJump) {
            setJumpValue(new Date(simTimeMs).toISOString().slice(0, 19));
          }
        }}
        className="rounded border border-space-border px-2 py-1 hover:border-space-accent"
      >
        Jump…
      </button>
      <div className="ml-2 whitespace-nowrap text-space-dim">
        SIM {new Date(simTimeMs).toISOString().slice(0, 19)}Z
      </div>
      {showJump && (
        <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-2 rounded-md border border-space-border bg-space-panel/95 px-2 py-2 backdrop-blur">
          <input
            type="datetime-local"
            step="1"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            className="rounded border border-space-border bg-space-bg px-2 py-1 text-space-text"
          />
          <button
            onClick={jump}
            className="rounded border border-space-accent px-2 py-1 text-space-accent hover:bg-space-accent/10"
          >
            Go
          </button>
          <button
            onClick={() => setShowJump(false)}
            className="text-space-dim hover:text-space-text"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
