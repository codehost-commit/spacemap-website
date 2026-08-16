import { useEffect, useState } from 'react';
import { Clock, Layers, Radio, Search, X } from 'lucide-react';
import { GlobeCanvas } from '../components/GlobeCanvas.js';
import { HeaderHUD } from '../components/HeaderHUD.js';
import { TelemetryPanel } from '../components/TelemetryPanel.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { SearchBox } from '../components/SearchBox.js';
import { TimeControls } from '../components/TimeControls.js';
import { OverlayToolbar } from '../components/OverlayToolbar.js';
import { IssCamera } from '../components/IssCamera.js';
import { LocalSkyView } from '../components/LocalSkyView.js';
import { SavedList } from '../components/SavedList.js';
import { CatalogStatusBanner } from '../components/CatalogStatusBanner.js';
import { ConjunctionLeaderboard } from '../components/ConjunctionLeaderboard.js';
import { LaunchTracker } from '../components/LaunchTracker.js';
import { PassPredictions } from '../components/PassPredictions.js';
import { AdminConsole } from '../components/AdminConsole.js';
import { TimelineScrubber } from '../components/TimelineScrubber.js';
import { SystemPill } from '../components/SystemPill.js';
import { BodySwitcher } from '../components/BodySwitcher.js';
import { useStore } from '../state/store.js';

const TRACKER_GUIDE_KEY = 'spacemap.tracker.onboarding.dismissed.v1';

/** The original SpaceMap tracker app, now mounted at /tracker */
export function TrackerPage() {
  const [showGuide, setShowGuide] = useState(false);
  const body = useStore((s) => s.body);
  const isEarth = body === 'earth';

  // Lock body scrolling for the fullscreen tracker
  useEffect(() => {
    document.body.classList.add('tracker-mode');
    return () => document.body.classList.remove('tracker-mode');
  }, []);

  useEffect(() => {
    try {
      setShowGuide(localStorage.getItem(TRACKER_GUIDE_KEY) !== '1');
    } catch {
      setShowGuide(true);
    }
  }, []);

  function dismissGuide() {
    setShowGuide(false);
  }

  function hideGuideOnFutureVisits() {
    setShowGuide(false);
    try {
      localStorage.setItem(TRACKER_GUIDE_KEY, '1');
    } catch {
      /* localStorage can be blocked */
    }
  }

  return (
    <div className="relative h-full w-full">
      {/*
        key={body} — remount GlobeCanvas when the user swaps bodies. The
        cleanup path in GlobeCanvas fully tears down the Cesium viewer, and
        a fresh mount boots one against the new body's ellipsoid + imagery.
        Cheaper to write than trying to hot-swap Cesium's globe in-place,
        and gives us a clean slate for every body.
      */}
      <GlobeCanvas key={body} />
      <HeaderHUD />
      <BodySwitcher />
      {showGuide && isEarth && (
        <div className="pointer-events-none absolute left-1/2 top-40 z-30 w-[min(92vw,44rem)] -translate-x-1/2">
          <div className="pointer-events-auto overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.14))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl md:p-7">
            <div className="absolute right-[-2rem] top-[-2rem] h-24 w-24 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-3">
                    <SystemPill tone="live" icon={Radio} pulse>
                      First pass
                    </SystemPill>
                    <SystemPill tone="neutral">
                      Shown on each visit by default
                    </SystemPill>
                  </div>
                  <h1 className="mt-4 text-2xl font-semibold leading-tight text-white">
                    Start with search, then layers, then time.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-space-dim">
                    The tracker is dense on purpose, but the first move is simple: find one object,
                    toggle the overlays you care about, and scrub the timeline once the scene makes sense.
                  </p>
                </div>
                <button
                  onClick={dismissGuide}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
                  aria-label="Dismiss tracker guide"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  {
                    icon: Search,
                    title: 'Search',
                    desc: 'Find any object by name or NORAD ID first.',
                  },
                  {
                    icon: Layers,
                    title: 'Layers',
                    desc: 'Turn on the overlays and feeds that matter to you.',
                  },
                  {
                    icon: Clock,
                    title: 'Time',
                    desc: 'Scrub forward or backward to understand motion.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-space-accent">
                      <item.icon size={18} />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-space-dim">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={dismissGuide}
                  className="inline-flex items-center gap-2 rounded-xl border border-space-accent/30 bg-space-accent/10 px-5 py-3 text-sm font-semibold text-space-accent transition-all hover:bg-space-accent/15 hover:text-white"
                >
                  <Radio size={16} />
                  Start tracking
                </button>
                <button
                  onClick={hideGuideOnFutureVisits}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-space-dim transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Do not show on future visits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isEarth && <MoonModeBanner />}
      {isEarth && <SearchBox />}
      {isEarth && (
        <div className="spacemap-right-rail pointer-events-none absolute right-4 top-40 z-20 flex w-[19.25rem] flex-col gap-4">
          <FilterPanel />
          <OverlayToolbar />
        </div>
      )}
      {isEarth && <SavedList />}
      {isEarth && <TelemetryPanel />}
      {isEarth && <LocalSkyView />}
      {isEarth && <IssCamera />}
      {isEarth && <ConjunctionLeaderboard />}
      {isEarth && <LaunchTracker />}
      {isEarth && <PassPredictions />}
      <TimeControls />
      <TimelineScrubber />
      {isEarth && <CatalogStatusBanner />}
      <AdminConsole />
    </div>
  );
}

/**
 * "You're on the Moon now" primer — replaces the Earth right-rail while
 * Beyond-Earth Part 1 is active. Explains what's live (detailed terrain)
 * and what's still coming (orbiters, surface markers).
 */
function MoonModeBanner() {
  return (
    <div className="pointer-events-auto absolute right-4 top-40 z-20 w-[19.25rem] rounded-2xl border border-space-border bg-space-panel/92 p-4 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="text-[9px] uppercase tracking-widest text-space-accent">Beyond Earth · Part 1</div>
      <div className="mt-2 text-sm font-semibold text-white">Welcome to the Moon.</div>
      <p className="mt-2 leading-relaxed text-space-dim">
        You're looking at NASA's LRO WAC global mosaic — 100 m per pixel of real lunar
        surface, streamed live from Moon Trek. Every crater below 100 m across is here.
      </p>
      <ul className="mt-3 space-y-1.5 text-[11px] text-space-dim">
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" />
          <span>Detailed lunar terrain — <span className="text-space-text">live</span></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-space-warn/70" />
          <span>Lunar orbiters (LRO, Danuri, Chandrayaan) — <span className="text-space-text">Part 2</span></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-space-warn/40" />
          <span>Surface markers: landers, Apollo sites, crash sites — <span className="text-space-text">Part 3</span></span>
        </li>
      </ul>
      <p className="mt-3 border-t border-white/5 pt-3 text-[10px] leading-relaxed text-space-dim">
        Drag to rotate · scroll to zoom · switch back to Earth any time above.
      </p>
    </div>
  );
}
