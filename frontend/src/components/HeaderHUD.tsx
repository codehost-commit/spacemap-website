import { useEffect, useState } from 'react';
import { useStore } from '../state/store.js';
import { LocateButton } from './LocateButton.js';
import { adminLog } from '../admin/admin-log.js';
import { BrandMark } from './BrandMark.js';
import { LUNAR_ORBITERS } from '../simulation/lunar-catalog.js';
import { LUNAR_SURFACE_SITES } from '../simulation/lunar-surface-catalog.js';

/** Top HUD: brand, catalog status, sim + wall clocks, connection health. */
export function HeaderHUD() {
  const status = useStore((s) => s.catalogStatus);
  const error = useStore((s) => s.catalogError);
  const trackableCatalogSize = useStore((s) => s.trackableCatalogSize);
  const trackableTargetCount = useStore((s) => s.trackableTargetCount);
  const catalogHydrating = useStore((s) => s.catalogHydrating);
  const snapshotCount = useStore((s) => s.snapshot?.count ?? 0);
  const simTimeMs = useStore((s) => s.simTimeMs);
  const multiplier = useStore((s) => s.simMultiplier);
  const paused = useStore((s) => s.simPaused);
  const body = useStore((s) => s.body);
  const surfaceOn = useStore((s) => s.lunarSurfaceOn);
  const isMoon = body === 'moon';

  const [wallNow, setWallNow] = useState(() => Date.now());
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWallNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // rAF-based FPS meter — count frames, publish once per second.
  useEffect(() => {
    let frames = 0;
    let lastPublish = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - lastPublish >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastPublish)));
        frames = 0;
        lastPublish = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drift = simTimeMs - wallNow;
  const driftLabel =
    Math.abs(drift) < 2000 ? 'live' : `${drift > 0 ? '+' : '−'}${formatDuration(Math.abs(drift))}`;

  function openAdminConsole() {
    adminLog.push('main', {
      channel: 'sys',
      severity: 'info',
      text: 'admin console opened',
    });
    useStore.getState().setAdminOpen(true);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-4 py-3">
      <div className="spacemap-hud spacemap-hud-brand pointer-events-auto flex w-[19.25rem] flex-col items-center gap-2 rounded-2xl border border-space-border bg-space-panel/94 px-4 py-3 shadow-[0_24px_56px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <a href="/" className="flex w-full items-center justify-center" aria-label="Go to SpaceMap home">
          <BrandMark compact />
        </a>
        <LocateButton />
      </div>

      <div className="spacemap-hud pointer-events-auto flex items-center gap-4 rounded-2xl border border-space-border bg-space-panel/94 px-4 py-3 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {isMoon ? (
          <>
            {/*
              Moon stats — the Earth catalog numbers ("Trackable", "Rendered")
              are meaningless in lunar view, so we swap in what actually
              exists here: the orbiter count and the surface-site count.
            */}
            <Stat label="Orbiters" value={LUNAR_ORBITERS.length.toString()} />
            <Stat
              label="Surface sites"
              value={surfaceOn ? LUNAR_SURFACE_SITES.length.toString() : 'off'}
            />
          </>
        ) : (
          <>
            <Stat
              label="Trackable"
              value={
                catalogHydrating && trackableTargetCount > trackableCatalogSize
                  ? `${trackableCatalogSize.toLocaleString()} / ${trackableTargetCount.toLocaleString()}`
                  : trackableCatalogSize.toLocaleString()
              }
            />
            <Stat label="Rendered" value={snapshotCount.toLocaleString()} />
          </>
        )}
        <Stat
          label="Speed"
          value={`${paused ? '⏸ ' : ''}${multiplier >= 0 ? '' : '−'}${Math.abs(multiplier)}×`}
        />
        <Stat label="Sim (UTC)" value={new Date(simTimeMs).toISOString().slice(11, 19)} />
        <Stat label="Δ vs now" value={driftLabel} />
        <Stat
          label="FPS"
          value={
            <span
              className={
                fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-space-warn' : 'text-space-bad'
              }
            >
              {fps || 'N/A'}
            </span>
          }
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={openAdminConsole}
            title="Open admin console"
            aria-label="Open admin console"
            className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <span
              className={`block h-2 w-2 rounded-full ${statusColor(isMoon ? 'ready' : status)}`}
              title={isMoon ? 'lunar view' : error ?? status}
            />
          </button>
          <span className="text-space-dim">{isMoon ? 'LUNAR' : statusLabel(status)}</span>
          {!isMoon && catalogHydrating && status === 'ready' && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-space-accent/80">
              Syncing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-space-dim">{label}</span>
      <span className="text-space-text">{value}</span>
    </div>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case 'ready':
      return 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400';
    case 'loading':
      return 'bg-space-warn shadow-[0_0_8px] shadow-space-warn';
    case 'error':
      return 'bg-space-bad shadow-[0_0_8px] shadow-space-bad';
    default:
      return 'bg-space-dim';
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'ready':
      return 'LIVE';
    case 'loading':
      return 'LOADING';
    case 'error':
      return 'ERROR';
    default:
      return 'IDLE';
  }
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
