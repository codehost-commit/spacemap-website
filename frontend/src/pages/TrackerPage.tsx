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
import { LunarFilterPanel } from '../components/LunarFilterPanel.js';
import { LunarTelemetryPanel } from '../components/LunarTelemetryPanel.js';
import { LunarSurfacePanel } from '../components/LunarSurfacePanel.js';
import { useStore } from '../state/store.js';
import { LUNAR_ORBITERS, LUNAR_KIND_COLOR } from '../simulation/lunar-catalog.js';

const TRACKER_GUIDE_KEY = 'spacemap.tracker.onboarding.dismissed.v1';

/** The original SpaceMap tracker app, now mounted at /tracker */
export function TrackerPage() {
  const [showGuide, setShowGuide] = useState(false);
  const body = useStore((s) => s.body);
  const isEarth = body === 'earth';
  const isMoon = body === 'moon';

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

      {/* Earth-only chrome */}
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
      {isEarth && <CatalogStatusBanner />}

      {/* Moon-only chrome */}
      {isMoon && (
        <div className="spacemap-right-rail pointer-events-none absolute right-4 top-40 z-20 flex w-[19.25rem] flex-col gap-4">
          <LunarFilterPanel />
          <LunarOrbiterList />
        </div>
      )}
      {isMoon && <LunarTelemetryPanel />}
      {isMoon && <LunarSurfacePanel />}

      <TimeControls />
      <TimelineScrubber />
      <AdminConsole />
    </div>
  );
}

/**
 * Compact roster of every lunar orbiter — clicking a row selects it,
 * exactly as clicking the dot on the globe does. Lives in the right rail
 * beneath the filter panel; small enough that we can just render the full
 * list instead of virtualising.
 */
function LunarOrbiterList() {
  const selectedId = useStore((s) => s.selectedLunarId);
  const setSelected = useStore((s) => s.setLunarSelection);
  const kindFilter = useStore((s) => s.lunarKindFilter);

  const visible = LUNAR_ORBITERS.filter((o) => kindFilter.has(o.kind));

  return (
    <aside className="spacemap-filter pointer-events-auto rounded-2xl border border-space-border bg-space-panel/92 p-3 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
        <span>Active lunar orbiters</span>
        <span>{visible.length}</span>
      </div>
      <div className="space-y-1">
        {visible.map((o) => {
          const isSelected = selectedId === o.id;
          const color = LUNAR_KIND_COLOR[o.kind];
          return (
            <button
              key={o.id}
              onClick={() => setSelected(isSelected ? null : o.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                isSelected
                  ? 'bg-space-accent/15 text-space-text shadow-[inset_0_0_0_1px_rgba(141,216,255,0.35)]'
                  : 'text-space-dim hover:bg-white/5 hover:text-space-text'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: color,
                  boxShadow: isSelected ? `0 0 8px ${color}` : 'none',
                }}
              />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="text-[10px] text-space-dim">{o.agency}</span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <div className="rounded-lg border border-white/5 bg-white/5 px-2 py-3 text-center text-[10px] text-space-dim">
            All mission types are hidden — enable at least one above.
          </div>
        )}
      </div>
    </aside>
  );
}
