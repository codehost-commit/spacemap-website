import type {
  CatalogChunkFile,
  CatalogChunkManifest,
  CatalogElementSource,
  CatalogSourceProvider,
  Tle,
} from '@spacemap/shared';
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

const SOURCE_PRIORITY: Record<CatalogSourceProvider, number> = {
  'celestrak-supgp': 320,
  'celestrak-gp': 220,
  'celestrak-tle': 140,
  'spacemap-bundled-tle': 120,
  unknown: 0,
};

type ChunkMode = 'replace' | 'append';

interface CatalogChunkDefinition {
  id: string;
  label: string;
  groups: string[];
  supplementalFiles?: string[];
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
    supplementalFiles: ['iss', 'css'],
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
    supplementalFiles: ['starlink', 'oneweb', 'kuiper', 'planet', 'orbcomm', 'iridium'],
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
    supplementalFiles: ['gps', 'glonass', 'intelsat', 'ses', 'telesat', 'eumetsat'],
  },
  {
    id: 'special',
    label: 'Special access catalog',
    groups: ['analyst', 'military', 'engineering', 'geodetic'],
    supplementalFiles: [],
  },
  {
    id: 'payloads',
    label: 'General on-orbit catalog',
    groups: ['active'],
    supplementalFiles: ['ast'],
  },
  {
    id: 'recent',
    label: 'Recent launches',
    groups: ['last-30-days'],
    supplementalFiles: [],
  },
  {
    id: 'debris',
    label: 'Tracked debris',
    groups: ['cosmos-2251-debris', 'fengyun-1c-debris', 'iridium-33-debris'],
    supplementalFiles: [],
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

function inferObjectType(
  metaType: string | undefined,
  name: string | undefined,
  provider: CatalogSourceProvider,
) {
  const normalized = normalizeCatalogObjectType(metaType);
  if (normalized !== 'unknown') return normalized;
  const upper = String(name ?? '').toUpperCase();
  if (upper.includes(' R/B') || upper.endsWith('R/B')) return 'rocket-body';
  if (upper.includes(' DEB')) return 'debris';
  if (provider === 'celestrak-gp' || provider === 'celestrak-supgp') return 'payload';
  return 'unknown';
}

function isPropagatableObject(record: Tle): boolean {
  const hasTle = Boolean(record.line1 && record.line2);
  if (hasTle) return true;
  return (
    Number.isFinite(record.meanMotion) &&
    Number.isFinite(record.eccentricity) &&
    Number.isFinite(record.inclinationDeg) &&
    Number.isFinite(record.raanDeg) &&
    Number.isFinite(record.argPerigeeDeg) &&
    Number.isFinite(record.meanAnomalyDeg)
  );
}

function uniq(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function epochMs(record: Tle): number {
  const ms = Date.parse(record.epoch ?? '');
  return Number.isFinite(ms) ? ms : -1;
}

function incomingWins(current: Tle, incoming: Tle): boolean {
  const currentPriority = current.sourcePriority ?? 0;
  const incomingPriority = incoming.sourcePriority ?? 0;
  if (incomingPriority !== currentPriority) return incomingPriority > currentPriority;
  const currentPropagatable = isPropagatableObject(current);
  const incomingPropagatable = isPropagatableObject(incoming);
  if (incomingPropagatable !== currentPropagatable) return incomingPropagatable;
  return epochMs(incoming) > epochMs(current);
}

function mergeCatalogObject(current: Tle | undefined, incoming: Tle): Tle {
  if (!current) {
    return {
      ...incoming,
      sourceGroups: uniq(incoming.sourceGroups ?? []),
      sourceFeeds: uniq(incoming.sourceFeeds ?? []),
      propagatable: isPropagatableObject(incoming),
    };
  }
  const preferred = incomingWins(current, incoming) ? incoming : current;
  const fallback = preferred === incoming ? current : incoming;
  const merged: Tle = {
    ...fallback,
    ...preferred,
    sourceGroups: uniq([...(current.sourceGroups ?? []), ...(incoming.sourceGroups ?? [])]),
    sourceFeeds: uniq([...(current.sourceFeeds ?? []), ...(incoming.sourceFeeds ?? [])]),
  };
  if ((merged.objectType ?? 'unknown') === 'unknown') {
    merged.objectType =
      (current.objectType ?? 'unknown') !== 'unknown'
        ? current.objectType
        : incoming.objectType ?? 'unknown';
  }
  merged.propagatable = isPropagatableObject(merged);
  return merged;
}

function mergeIntoMap(map: Map<number, Tle>, record: Tle) {
  map.set(record.noradId, mergeCatalogObject(map.get(record.noradId), record));
}

function sourceDescriptor(
  provider: CatalogSourceProvider,
  feed: string,
  elementSource: CatalogElementSource,
) {
  return {
    provider,
    feed,
    elementSource,
    priority: SOURCE_PRIORITY[provider] ?? 0,
  };
}

async function fetchLiveChunk(definition: CatalogChunkDefinition): Promise<Tle[]> {
  const objectsById = new Map<number, Tle>();
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
        if (!Number.isFinite(noradId) || gpById.has(noradId)) continue;
        gpById.set(noradId, record);
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
      for (const record of parseTleText(
        tleText,
        sourceDescriptor(
          group === 'active' ? 'spacemap-bundled-tle' : 'celestrak-tle',
          group,
          'tle',
        ),
      )) {
        if (!tleById.has(record.noradId)) tleById.set(record.noradId, record);
      }
    }

    try {
      const satcatRecords = await fetchJsonSource<SatcatRecord[]>(
        `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=JSON`,
      );
      for (const record of satcatRecords ?? []) {
        const noradId = Number(record.NORAD_CAT_ID);
        if (!Number.isFinite(noradId) || metaById.has(noradId)) continue;
        metaById.set(noradId, record);
      }
    } catch {
      // Metadata gaps should not prevent real orbital objects from loading.
    }
  }

  for (const record of gpById.values()) {
    const object = buildCatalogObject(
      record,
      metaById.get(Number(record.NORAD_CAT_ID)),
      definition.id,
      sourceDescriptor('celestrak-gp', definition.id, 'gp'),
    );
    if (object) mergeIntoMap(objectsById, object);
  }

  for (const record of tleById.values()) {
    if (gpById.has(record.noradId)) continue;
    mergeIntoMap(
      objectsById,
      enrichLegacyCatalogObject(
        record,
        metaById.get(record.noradId),
        definition.id,
        sourceDescriptor(record.sourceProvider ?? 'celestrak-tle', definition.id, 'tle'),
      ),
    );
  }

  for (const file of definition.supplementalFiles ?? []) {
    try {
      const supRecords = await fetchJsonSource<GpRecord[]>(
        `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=${encodeURIComponent(file)}&FORMAT=json`,
      );
      for (const record of supRecords ?? []) {
        const object = buildCatalogObject(
          record,
          metaById.get(Number(record.NORAD_CAT_ID)),
          definition.id,
          sourceDescriptor('celestrak-supgp', `sup:${file}`, 'supgp'),
        );
        if (object) mergeIntoMap(objectsById, object);
      }
    } catch {
      // Supplemental feeds improve coverage/freshness, but shouldn't block the chunk.
    }
  }

  return Array.from(objectsById.values()).sort((a, b) => a.noradId - b.noradId);
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

function buildCatalogObject(
  gp: GpRecord,
  meta: SatcatRecord | undefined,
  chunkId: string,
  source: ReturnType<typeof sourceDescriptor>,
): Tle | null {
  const noradId = Number(gp.NORAD_CAT_ID ?? meta?.NORAD_CAT_ID);
  if (!Number.isFinite(noradId)) return null;
  const epoch = gp.EPOCH ? new Date(gp.EPOCH).toISOString() : null;
  if (!epoch) return null;
  const name = (gp.OBJECT_NAME ?? meta?.OBJECT_NAME ?? `#${noradId}`).trim();
  return {
    noradId,
    name,
    epoch,
    intlDesignator: gp.OBJECT_ID ?? meta?.OBJECT_ID,
    objectType: inferObjectType(meta?.OBJECT_TYPE, name, source.provider),
    opsStatusCode: meta?.OPS_STATUS_CODE,
    owner: meta?.OWNER,
    launchDate: meta?.LAUNCH_DATE,
    decayDate: meta?.DECAY_DATE,
    sourceGroups: [chunkId],
    sourceFeeds: [source.feed],
    sourceProvider: source.provider,
    sourcePriority: source.priority,
    elementSource: source.elementSource,
    propagatable: true,
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
  chunkId: string,
  source: ReturnType<typeof sourceDescriptor>,
): Tle {
  const name = record.name ?? meta?.OBJECT_NAME ?? `#${record.noradId}`;
  return {
    ...record,
    intlDesignator: record.intlDesignator ?? meta?.OBJECT_ID,
    objectType: inferObjectType(meta?.OBJECT_TYPE, name, source.provider),
    opsStatusCode: meta?.OPS_STATUS_CODE,
    owner: meta?.OWNER,
    launchDate: meta?.LAUNCH_DATE,
    decayDate: meta?.DECAY_DATE,
    sourceGroups: uniq([...(record.sourceGroups ?? []), chunkId]),
    sourceFeeds: uniq([...(record.sourceFeeds ?? []), source.feed]),
    sourceProvider: source.provider,
    sourcePriority: source.priority,
    elementSource: source.elementSource,
    propagatable: true,
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
  const tles = parseTleText(text, sourceDescriptor('spacemap-bundled-tle', 'tles.txt', 'tle'));
  if (tles.length === 0) throw new Error('no TLEs parsed');
  return tles;
}

export function parseTleText(
  text: string,
  source: ReturnType<typeof sourceDescriptor> = sourceDescriptor('spacemap-bundled-tle', 'legacy-tle', 'tle'),
): Tle[] {
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
    if (!Number.isFinite(noradId) || seen.has(noradId)) continue;
    seen.add(noradId);
    out.push({
      noradId,
      name,
      line1: l1,
      line2: l2,
      epoch: parseTleEpoch(l1),
      objectType: inferObjectType(undefined, name, source.provider),
      sourceGroups: ['legacy-tle'],
      sourceFeeds: [source.feed],
      sourceProvider: source.provider,
      sourcePriority: source.priority,
      elementSource: source.elementSource,
      propagatable: true,
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
