import { useEffect, useState } from 'react';

const LL2_LAUNCHES_URL =
  'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list&hide_recent_previous=true';
const LAUNCH_REFRESH_MS = 5 * 60 * 1000;

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

export function useUpcomingLaunches() {
  const [launches, setLaunches] = useState<UpcomingLaunch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(LL2_LAUNCHES_URL);
        if (!res.ok) throw new Error(`LL2 ${res.status}`);
        const body = (await res.json()) as { results?: UpcomingLaunch[] };
        if (!cancelled) {
          setLaunches(body.results ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    };
    void load();
    const id = window.setInterval(load, LAUNCH_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return {
    launches,
    error,
    loading: launches == null && error == null,
  };
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
