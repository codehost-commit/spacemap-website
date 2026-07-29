import { useEffect, useState } from 'react';

const LL2_LAUNCHES_URL =
  'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list&hide_recent_previous=true';
const BUNDLED_LAUNCHES_URL = `${import.meta.env.BASE_URL}data/launches.json`;
const LAUNCH_REFRESH_MS = 30 * 60 * 1000;
const LAUNCH_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const LAUNCH_RETRY_COOLDOWN_MS = 15 * 60 * 1000;
const LAUNCH_CACHE_KEY = 'spacemap.ll2.launches.v1';
const LAUNCH_COOLDOWN_KEY = 'spacemap.ll2.launches.cooldown.v1';

export interface LaunchVideoUrl {
  url?: string;
}

export interface LaunchMission {
  name?: string;
  description?: string;
}

export interface LaunchPad {
  name?: string;
  location?: { name?: string };
}

export interface LaunchStatus {
  name?: string;
}

export interface LaunchRocket {
  configuration?: { full_name?: string; name?: string };
}

export interface UpcomingLaunch {
  id: string;
  name: string;
  net: string;
  status?: LaunchStatus;
  rocket?: LaunchRocket;
  mission?: LaunchMission;
  pad?: LaunchPad;
  vidURLs?: LaunchVideoUrl[];
}

interface LaunchCache {
  fetchedAt: number;
  launches: UpcomingLaunch[];
}

let launchRequest: Promise<UpcomingLaunch[]> | null = null;

export function useUpcomingLaunches({ enabled = true }: { enabled?: boolean } = {}) {
  const [launches, setLaunches] = useState<UpcomingLaunch[] | null>(
    () => readLaunchCache()?.launches ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const load = async () => {
      const cached = readLaunchCache();
      if (cached?.launches.length) {
        setLaunches(prioritizeUpcoming(cached.launches));
      }

      if (cached && Date.now() - cached.fetchedAt < LAUNCH_CACHE_TTL_MS) {
        setError(null);
        return;
      }

      if (cached?.launches.length && isLaunchRetryCoolingDown()) {
        setError(null);
        return;
      }

      try {
        const nextLaunches = await loadUpcomingLaunches();
        if (!cancelled) {
          setLaunches(prioritizeUpcoming(nextLaunches));
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          const fallback = readLaunchCache();
          if (fallback?.launches.length) {
            setLaunches(prioritizeUpcoming(fallback.launches));
            setError(null);
          } else {
            setError('Launch feed is rate-limited right now. Retrying shortly.');
          }
        }
      }
    };
    void load();
    const id = window.setInterval(load, LAUNCH_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return {
    launches,
    error,
    loading: enabled && launches == null && error == null,
  };
}

async function loadUpcomingLaunches(): Promise<UpcomingLaunch[]> {
  if (launchRequest) return launchRequest;
  launchRequest = (async () => {
    const sources = import.meta.env.PROD ? [tryBundledLaunches, tryLiveLaunches] : [tryLiveLaunches];
    let firstError: unknown = null;

    try {
      for (const source of sources) {
        try {
          const launches = await source();
          writeLaunchCache(launches);
          clearLaunchRetryCooldown();
          return launches;
        } catch (sourceError) {
          firstError ??= sourceError;
        }
      }

      setLaunchRetryCooldown();
      if (firstError instanceof Error) {
        throw firstError;
      }
      throw new Error(String(firstError ?? 'launch feed unavailable'));
    } finally {
      launchRequest = null;
    }
  })();
  return launchRequest;
}

async function tryLiveLaunches(): Promise<UpcomingLaunch[]> {
  const res = await fetch(LL2_LAUNCHES_URL);
  if (!res.ok) throw new Error(`LL2 ${res.status}`);
  const body = (await res.json()) as { results?: UpcomingLaunch[] };
  return body.results ?? [];
}

async function tryBundledLaunches(): Promise<UpcomingLaunch[]> {
  const res = await fetch(BUNDLED_LAUNCHES_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`bundled launches ${res.status}`);
  const body = (await res.json()) as { results?: UpcomingLaunch[]; launches?: UpcomingLaunch[] };
  return body.results ?? body.launches ?? [];
}

function prioritizeUpcoming(launches: UpcomingLaunch[]): UpcomingLaunch[] {
  const now = Date.now() - 60_000;
  return [...launches]
    .filter((launch) => Number.isFinite(new Date(launch.net).getTime()))
    .sort((a, b) => new Date(a.net).getTime() - new Date(b.net).getTime())
    .filter((launch) => new Date(launch.net).getTime() >= now);
}

function readLaunchCache(): LaunchCache | null {
  try {
    const raw = localStorage.getItem(LAUNCH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaunchCache;
    if (!Array.isArray(parsed.launches)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLaunchCache(launches: UpcomingLaunch[]): void {
  try {
    localStorage.setItem(
      LAUNCH_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), launches: prioritizeUpcoming(launches) }),
    );
  } catch {
    /* localStorage can be disabled in private browsing */
  }
}

function isLaunchRetryCoolingDown(): boolean {
  try {
    const retryAt = Number(sessionStorage.getItem(LAUNCH_COOLDOWN_KEY) ?? 0);
    return Number.isFinite(retryAt) && Date.now() < retryAt;
  } catch {
    return false;
  }
}

function setLaunchRetryCooldown(): void {
  try {
    sessionStorage.setItem(LAUNCH_COOLDOWN_KEY, String(Date.now() + LAUNCH_RETRY_COOLDOWN_MS));
  } catch {
    /* sessionStorage can be disabled in private browsing */
  }
}

function clearLaunchRetryCooldown(): void {
  try {
    sessionStorage.removeItem(LAUNCH_COOLDOWN_KEY);
  } catch {
    /* sessionStorage can be disabled in private browsing */
  }
}

export function getLaunchTone(deltaMs: number) {
  if (deltaMs <= 2 * 60 * 60 * 1000) {
    return {
      label: 'Hot',
      textClass: 'text-[#ff6b6b]',
      dotClass: 'border-[#ff6b6b]/35 bg-[#ff6b6b]/12 text-[#ff9ca6]',
    };
  }
  if (deltaMs <= 24 * 60 * 60 * 1000) {
    return {
      label: 'Soon',
      textClass: 'text-[#ffd166]',
      dotClass: 'border-[#ffd166]/35 bg-[#ffd166]/12 text-[#ffe19a]',
    };
  }
  return {
    label: 'Tracked',
    textClass: 'text-[#8ed8ff]',
    dotClass: 'border-[#8ed8ff]/35 bg-[#8ed8ff]/12 text-[#c7efff]',
  };
}

export function formatLaunchCountdown(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const sign = deltaMs < 0 ? 'T+' : 'T-';
  const totalSec = Math.floor(abs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (days > 0) return `${sign}${days}d ${pad(hours)}h`;
  return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
