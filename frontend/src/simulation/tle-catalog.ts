import type { CatalogChunkFile, CatalogChunkManifest, Tle } from '@spacemap/shared';
import { normalizeCatalogObjectType } from '@spacemap/shared';

const BASE_URL = import.meta.env.BASE_URL;
const IS_DEV = import.meta.env.DEV;
const MANIFEST_URL = `${BASE_URL}data/catalog-manifest.json`;
const BUNDLED_TLE_URL = `${BASE_URL}data/tles.txt`;
const JSON_PROXY_PREFIX = 'https://corsproxy.io/?url=';
const ACTIVE_TLE_FALLBACKS = [
  BUNDLED_TLE_URL,
  'https://spacemap.earth/data/tles.txt',
  'https://codehost-commit.github.io/spacemap-website/data/tles.txt',
];

type ChunkMode = 'replace' | 'append';

interface CatalogChunkDefinition {
  id: string;
  label: string;
  groups: string[];
}

interface LoadCatalogOptions {
  onChunk: (chunk: {
    id: string;
    label: string;
    objects: Tle[];
    mode: ChunkMode;
    loadedCount: number;
    totalCount: number;
    hydrating: boolean;
  }) => void | Promise<void>;
  maxChunks?: number;
}

interface GpRecord {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  EPOCH?: string;
  MEAN_MOTION?: number;
  ECCENTRICITY?: number;
  INCLINATION?: number;
  RA_OF_ASC_NODE?: number;
  ARG_OF_PERICENTER?: number;
  MEAN_ANOMALY?: number;
  BSTAR?: number;
  MEAN_MOTION_DOT?: number;
  MEAN_MOTION_DDOT?: number;
  EPHEMERIS_TYPE?: number;
  CLASSIFICATION_TYPE?: string;
  NORAD_CAT_ID?: number;
  REV_AT_EPOCH?: number;
}

interface SatcatRecord {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID?: number;
  OBJECT_TYPE?: string;
  OPS_STATUS_CODE?: string;
  OWNER?: string;
  LAUNCH_DATE?: string;
  DECAY_DATE?: string;
}

const LIVE_CHUNKS: CatalogChunkDefinition[] = [
  {
    id: 'core',
    label: 'Startup catalog',
    groups: [
      'stations',
      'visual',
      'science',
      'weather',
      'resource',
      'radar',
      'sar',
      'sarsat',
      'tdrss',
      'argos',
      'cubesat',
      'education',
      'amateur',
      'satnogs',
    ],
  },
  {
    id: 'constellations',
    label: 'Live constellations',
    groups: [
      'starlink',
      'oneweb',
      'iridium-NEXT',
      'kuiper',
      'qianfan',
      'planet',
      'spire',
      'dmc',
      'globalstar',
      'orbcomm',
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation and comms',
    groups: [
      'geo',
      'gnss',
      'gps-ops',
      'glo-ops',
      'galileo',
      'beidou',
      'sbas',
      'intelsat',
      'ses',
      'eutelsat',
      'other-comm',
      'x-comm',
      'telesat',
      'hulianwang',
    ],
  },
  {
    id: 'special',
    label: 'Special access catalog',
    groups: ['analyst', 'military', 'engineering', 'geodetic'],
  },
  {
    id: 'payloads',
    label: 'General on-orbit catalog',
    groups: ['active'],
  },
  {
    id: 'recent',
    label: 'Recent launches',
    groups: ['last-30-days'],
  },
  {
    id: 'debris',
    label: 'Tracked debris',
    groups: ['cosmos-2251-debris', 'fengyun-1c-debris', 'iridium-33-debris'],
  },
];

export async function loadCatalogProgressively({
  onChunk,
  maxChunks,
}: LoadCatalogOptions): Promise<void> {
  const cappedChunks = typeof maxChunks === 'number' ? Math.max(1, maxChunks) : Infinity;
  const bundledManifest = await tryBundledManifest();
  if (bundledManifest) {
    let loadedCount = 0;
    const chunks = bundledManifest.chunks.slice(0, cappedChunks);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const payload = await fetchBundledChunk(chunk.path);
      loadedCount += payload.objects.length;
      await onChunk({
        id: payload.id,
        label: payload.label,
        objects: payload.objects,
        mode: i === 0 ? 'replace' : 'append',
        loadedCount,
        totalCount: bundledManifest.totalCount,
        hydrating: i < chunks.length - 1,
      });
    }
    return;
  }

  try {
    let loadedCount = 0;
    const liveChunks = LIVE_CHUNKS.slice(0, cappedChunks);
    for (let i = 0; i < liveChunks.length; i++) {
      const definition = liveChunks[i];
      const objects = await fetchLiveChunk(definition);
      loadedCount += objects.length;
      await onChunk({
        id: definition.id,
        label: definition.label,
        objects,
        mode: i === 0 ? 'replace' : 'append',
        loadedCount,
        totalCount: loadedCount,
        hydrating: i < liveChunks.length - 1,
      });
    }
    return;
  } catch (liveError) {
    const backend = IS_DEV ? await tryBackend().catch(() => null) : null;
    const fallback = backend?.length ? backend : await tryBundledTleFallback();
    await onChunk({
      id: 'legacy-fallback',
      label: 'Legacy fallback',
      objects: fallback,
      mode: 'replace',
      loadedCount: fallback.length,
      totalCount: fallback.length,
      hydrating: false,
    });
    if (!fallback.length) {
      throw liveError instanceof Error ? liveError : new Error(String(liveError));
    }
  }
}

export async function fetchTles(): Promise<Tle[]> {
  const startupChunk: Tle[] = [];
  await loadCatalogProgressively({
    maxChunks: 1,
    onChunk: ({ objects }) => {
      startupChunk.push(...objects);
    },
  });
  if (startupChunk.length > 0) return startupChunk;

  if (IS_DEV) {
    const backend = await tryBackend().catch(() => null);
    if (backend?.length) return backend;
  }
  return tryBundledTleFallback();
}

async function tryBundledManifest(): Promise<CatalogChunkManifest | null> {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.json()) as CatalogChunkManifest;
  } catch {
    return null;
  }
}

async function fetchBundledChunk(path: string): Promise<CatalogChunkFile> {
  const res = await fetch(path.startsWith('http') ? path : `${BASE_URL}${path.replace(/^\/+/u, '')}`, {
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error(`bundled catalog chunk ${res.status}`);
  return (await res.json()) as CatalogChunkFile;
}

async function fetchLiveChunk(definition: CatalogChunkDefinition): Promise<Tle[]> {
  const gpById = new Map<number, GpRecord>();
  const tleById = new Map<number, Tle>();
  const metaById = new Map<number, SatcatRecord>();

  for (const group of definition.groups) {
    try {
      const gpRecords = await fetchJsonSource<GpRecord[]>(
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`,
      );
      for (const record of gpRecords ?? []) {
        const noradId = Number(record.NORAD_CAT_ID);
        if (!Number.isFinite(noradId)) continue;
        if (!gpById.has(noradId)) gpById.set(noradId, record);
      }
    } catch {
      const tleText = await fetchTextSourceCandidates(
        group === 'active'
          ? [
              `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`,
              ...ACTIVE_TLE_FALLBACKS,
            ]
          : [`https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`],
      );
      for (const record of parseTleText(tleText)) {
        if (!tleById.has(record.noradId)) {
          tleById.set(record.noradId, { ...record, sourceGroups: [definition.id] });
        }
      }
    }

    try {
      const satcatRecords = await fetchJsonSource<SatcatRecord[]>(
        `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=JSON`,
      );
      for (const record of satcatRecords ?? []) {
        const noradId = Number(record.NORAD_CAT_ID);
        if (!Number.isFinite(noradId)) continue;
        if (!metaById.has(noradId)) metaById.set(noradId, record);
      }
    } catch {
      // Metadata gaps should not prevent real orbital objects from loading.
    }
  }

  const objectsFromGp = Array.from(gpById.values())
    .map((record) =>
      buildCatalogObject(record, metaById.get(Number(record.NORAD_CAT_ID)), definition.id),
    )
    .filter((record): record is Tle => record != null);
  const objectsFromTle = Array.from(tleById.values())
    .filter((record) => !gpById.has(record.noradId))
    .map((record) => enrichLegacyCatalogObject(record, metaById.get(record.noradId), definition.id));

  return [...objectsFromGp, ...objectsFromTle];
}

async function fetchJsonSource<T>(url: string): Promise<T> {
  let firstError: unknown = null;
  for (const candidate of [url, `${JSON_PROXY_PREFIX}${encodeURIComponent(url)}`]) {
    try {
      const res = await fetch(candidate, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (firstError == null) firstError = err;
    }
  }
  throw firstError instanceof Error ? firstError : new Error(String(firstError));
}

async function fetchTextSource(url: string): Promise<string> {
  return fetchTextSourceCandidates([url]);
}

async function fetchTextSourceCandidates(urls: string[]): Promise<string> {
  let firstError: unknown = null;
  for (const url of urls) {
    for (const candidate of [url, `${JSON_PROXY_PREFIX}${encodeURIComponent(url)}`]) {
      try {
        const res = await fetch(candidate, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`status ${res.status}`);
        return await res.text();
      } catch (err) {
        if (firstError == null) firstError = err;
      }
    }
  }
  throw firstError instanceof Error ? firstError : new Error(String(firstError));
}

function buildCatalogObject(gp: GpRecord, meta: SatcatRecord | undefined, group: string): Tle | null {
  const noradId = Number(gp.NORAD_CAT_ID ?? meta?.NORAD_CAT_ID);
  if (!Number.isFinite(noradId)) return null;
  const epoch = gp.EPOCH ? new Date(gp.EPOCH).toISOString() : null;
  if (!epoch) return null;
  return {
    noradId,
    name: (gp.OBJECT_NAME ?? meta?.OBJECT_NAME ?? `#${noradId}`).trim(),
    epoch,
    intlDesignator: gp.OBJECT_ID ?? meta?.OBJECT_ID,
    objectType: normalizeCatalogObjectType(meta?.OBJECT_TYPE),
    opsStatusCode: meta?.OPS_STATUS_CODE,
    owner: meta?.OWNER,
    launchDate: meta?.LAUNCH_DATE,
    decayDate: meta?.DECAY_DATE,
    sourceGroups: [group],
    classificationType: gp.CLASSIFICATION_TYPE,
    meanMotion: numberOrUndefined(gp.MEAN_MOTION),
    eccentricity: numberOrUndefined(gp.ECCENTRICITY),
    inclinationDeg: numberOrUndefined(gp.INCLINATION),
    raanDeg: numberOrUndefined(gp.RA_OF_ASC_NODE),
    argPerigeeDeg: numberOrUndefined(gp.ARG_OF_PERICENTER),
    meanAnomalyDeg: numberOrUndefined(gp.MEAN_ANOMALY),
    bstar: numberOrUndefined(gp.BSTAR),
    meanMotionDot: numberOrUndefined(gp.MEAN_MOTION_DOT),
    meanMotionDDot: numberOrUndefined(gp.MEAN_MOTION_DDOT),
    ephemerisType: numberOrUndefined(gp.EPHEMERIS_TYPE),
    revAtEpoch: numberOrUndefined(gp.REV_AT_EPOCH),
  };
}

function enrichLegacyCatalogObject(
  record: Tle,
  meta: SatcatRecord | undefined,
  group: string,
): Tle {
  return {
    ...record,
    intlDesignator: record.intlDesignator ?? meta?.OBJECT_ID,
    objectType: meta ? normalizeCatalogObjectType(meta.OBJECT_TYPE) : record.objectType ?? 'unknown',
    opsStatusCode: meta?.OPS_STATUS_CODE,
    owner: meta?.OWNER,
    launchDate: meta?.LAUNCH_DATE,
    decayDate: meta?.DECAY_DATE,
    sourceGroups: [group],
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function tryBackend(): Promise<Tle[]> {
  const res = await fetch('/api/tles', { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = (await res.json()) as { count: number; tles: Tle[] };
  return body.tles;
}

async function tryBundledTleFallback(): Promise<Tle[]> {
  const res = await fetch(BUNDLED_TLE_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const text = await res.text();
  const tles = parseTleText(text);
  if (tles.length === 0) throw new Error('no TLEs parsed');
  return tles;
}

/**
 * Parse a CelesTrak-style 3-line TLE text blob (name, line1, line2 repeating).
 * Copy of the backend parser so the frontend has no server dependency.
 */
export function parseTleText(text: string): Tle[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const out: Tle[] = [];
  const seen = new Set<number>();
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) {
      i -= 2;
      continue;
    }
    const noradId = Number(l1.slice(2, 7).trim());
    if (!Number.isFinite(noradId)) continue;
    if (seen.has(noradId)) continue;
    seen.add(noradId);
    out.push({
      noradId,
      name,
      line1: l1,
      line2: l2,
      epoch: parseTleEpoch(l1),
      objectType: 'unknown',
      sourceGroups: ['legacy-tle'],
    });
  }
  return out;
}

function parseTleEpoch(line1: string): string {
  const yy = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return new Date().toISOString();
  const fullYear = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return new Date(ms).toISOString();
}
