import { useStore } from '../state/store.js';
import { getClockControls } from './clock-controls.js';

/**
 * Global keyboard shortcuts. Registers a single keydown listener; keys are
 * ignored when the user is typing in an input / textarea so they don't fight
 * with the search box or jump-to-time picker.
 */
export function installKeyboardShortcuts(): () => void {
  const handler = (ev: KeyboardEvent) => {
    // Don't hijack typing.
    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
      if (ev.key === 'Escape') target?.blur();
      return;
    }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

    const state = useStore.getState();
    const clock = getClockControls();

    switch (ev.key) {
      case '/': {
        ev.preventDefault();
        const search = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"]',
        );
        search?.focus();
        search?.select();
        break;
      }
      case ' ': {
        ev.preventDefault();
        clock?.setPaused(!state.simPaused);
        break;
      }
      case 'n':
      case 'N': {
        clock?.jumpToNow();
        break;
      }
      case '+':
      case '=': {
        clock?.setMultiplier(nextSpeed(state.simMultiplier, +1));
        break;
      }
      case '-':
      case '_': {
        clock?.setMultiplier(nextSpeed(state.simMultiplier, -1));
        break;
      }
      case 'r':
      case 'R': {
        clock?.setMultiplier(-state.simMultiplier || -1);
        break;
      }
      case 'f':
      case 'F': {
        if (state.selectedNoradId != null) state.setCameraMode('follow');
        break;
      }
      case 'p':
      case 'P': {
        if (state.selectedNoradId != null) state.setCameraMode('pov');
        break;
      }
      case 'o':
      case 'O': {
        state.setCameraMode('orbit');
        break;
      }
      case 'Escape': {
        state.select(null);
        break;
      }
      case '[': {
        cycleSaved(-1);
        break;
      }
      case ']': {
        cycleSaved(+1);
        break;
      }
      case '?': {
        window.dispatchEvent(new CustomEvent('spacemap:toggle-help'));
        break;
      }
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

const SPEEDS = [1, 5, 10, 25, 100, 1000] as const;
function nextSpeed(current: number, delta: 1 | -1): number {
  const sign = current < 0 ? -1 : 1;
  const magnitude = Math.abs(current) || 1;
  let idx = SPEEDS.indexOf(magnitude as (typeof SPEEDS)[number]);
  if (idx < 0) idx = 0;
  idx = Math.max(0, Math.min(SPEEDS.length - 1, idx + delta));
  return sign * SPEEDS[idx];
}

function cycleSaved(delta: 1 | -1): void {
  const s = useStore.getState();
  const list = [...s.savedIds];
  if (list.length === 0) return;
  const currentIdx = s.selectedNoradId != null ? list.indexOf(s.selectedNoradId) : -1;
  const nextIdx = (((currentIdx + delta) % list.length) + list.length) % list.length;
  const target = list[currentIdx < 0 ? 0 : nextIdx];
  s.select(target);
  (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(target);
}
