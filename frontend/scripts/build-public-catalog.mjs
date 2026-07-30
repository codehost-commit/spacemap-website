import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CHUNKS = [
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
  {
    id: 'known',
    label: 'Known public catalog',
    groups: [],
    supplementalFiles: [],
    satcatFull: true,
  },
];

const SOURCE_PRIORITY = {
  'celestrak-supgp': 320,
  'celestrak-gp': 220,
  'celestrak-satcat': 40,
  'celestrak-tle': 140,
  'spacemap-bundled-tle': 120,
  unknown: 0,
};

const TLE_FALLBACKS = {
  active: [
    'https://spacemap.earth/data/tles.txt',
    'https://codehost-commit.github.io/spacemap-website/data/tles.txt',
  ],
};

function normalizeCatalogObjectType(raw = '') {
  const value = String(raw).trim().toUpperCase();
  if (value === 'PAY' || value === 'PAYLOAD') return 'payload';
  if (value === 'R/B' || value === 'ROCKET BODY' || value === 'ROCKET-BODY') return 'rocket-body';
  if (value === 'DEB' || value === 'DEBRIS') return 'debris';
  return 'unknown';
}

function inferObjectType(metaType, name, provider) {
  const normalized = normalizeCatalogObjectType(metaType);
  if (normalized !== 'unknown') return normalized;
  const upper = String(name ?? '').toUpperCase();
  if (upper.includes(' R/B') || upper.endsWith('R/B')) return 'rocket-body';
  if (upper.includes(' DEB')) return 'debris';
  if (provider === 'celestrak-gp' || provider === 'celestrak-supgp') return 'payload';
  return 'unknown';
}

function finiteOrUndefined(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isPropagatableObject(record) {
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

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function epochMs(record) {
  const ms = Date.parse(record.epoch ?? '');
  return Number.isFinite(ms) ? ms : -1;
}

function incomingWins(current, incoming) {
  const currentPriority = current.sourcePriority ?? 0;
  const incomingPriority = incoming.sourcePriority ?? 0;
  if (incomingPriority !== currentPriority) return incomingPriority > currentPriority;
  const currentPropagatable = isPropagatableObject(current);
  const incomingPropagatable = isPropagatableObject(incoming);
  if (incomingPropagatable !== currentPropagatable) return incomingPropagatable;
  return epochMs(incoming) > epochMs(current);
}

function mergeCatalogObject(current, incoming) {
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
  const merged = {
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

function mergeIntoMap(map, record) {
  const current = map.get(record.noradId);
  map.set(record.noradId, mergeCatalogObject(current, record));
}

async function fetchWithCurl(url, headers) {
  const userAgent = headers['User-Agent'] ?? headers['user-agent'];
  const baseHeaderArgs = Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== 'user-agent')
    .flatMap(([key, value]) => ['-H', `${key}: ${value}`]);

  const attempts = [
    ['-fsSL', '--max-time', '45', ...(userAgent ? ['-A', userAgent] : []), ...baseHeaderArgs, url],
    ['-fsSL', '--max-time', '45', ...baseHeaderArgs, url],
  ];

  let lastError;
  for (const args of attempts) {
    try {
      const { stdout } = await execFileAsync('curl', args, { maxBuffer: 64 * 1024 * 1024 });
      return stdout;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchJson(url, headers) {
  const body = await fetchWithCurl(url, headers);
  try {
    return JSON.parse(body);
  } catch (err) {
    throw new Error(`${url} JSON parse failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function fetchText(url, headers) {
  return fetchWithCurl(url, headers);
}

async function tryFetchText(urls, headers) {
  let lastError;
  for (const url of urls) {
    try {
      return await fetchText(url, headers);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function parseCsvObjects(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = values[i] ?? '';
    return row;
  });
}

function parseTleEpoch(line1) {
  const yy = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return new Date().toISOString();
  const fullYear = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86400000;
  return new Date(ms).toISOString();
}

function parseTleText(text, source) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      i -= 2;
      continue;
    }
    const noradId = Number(line1.slice(2, 7).trim());
    if (!Number.isFinite(noradId) || seen.has(noradId)) continue;
    seen.add(noradId);
    out.push({
      noradId,
      name,
      line1,
      line2,
      epoch: parseTleEpoch(line1),
      objectType: inferObjectType(undefined, name, source.provider),
      sourceGroups: [],
      sourceFeeds: [source.feed],
      sourceProvider: source.provider,
      sourcePriority: source.priority,
      elementSource: source.elementSource,
      propagatable: true,
    });
  }
  return out;
}

function buildObject(gp, meta, chunkId, source) {
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
    classificationType: gp.CLASSIFICATION_TYPE,
    meanMotion: finiteOrUndefined(gp.MEAN_MOTION),
    eccentricity: finiteOrUndefined(gp.ECCENTRICITY),
    inclinationDeg: finiteOrUndefined(gp.INCLINATION),
    raanDeg: finiteOrUndefined(gp.RA_OF_ASC_NODE),
    argPerigeeDeg: finiteOrUndefined(gp.ARG_OF_PERICENTER),
    meanAnomalyDeg: finiteOrUndefined(gp.MEAN_ANOMALY),
    bstar: finiteOrUndefined(gp.BSTAR),
    meanMotionDot: finiteOrUndefined(gp.MEAN_MOTION_DOT),
    meanMotionDDot: finiteOrUndefined(gp.MEAN_MOTION_DDOT),
    ephemerisType: finiteOrUndefined(gp.EPHEMERIS_TYPE),
    revAtEpoch: finiteOrUndefined(gp.REV_AT_EPOCH),
  };
}

function satcatRowToKnownObject(row, chunkId) {
  const noradId = Number(row.NORAD_CAT_ID);
  if (!Number.isFinite(noradId)) return null;
  const name = String(row.OBJECT_NAME ?? `#${noradId}`).trim();
  const launchDate = String(row.LAUNCH_DATE ?? '').trim();
  const decayDate = String(row.DECAY_DATE ?? '').trim();
  return {
    noradId,
    name,
    epoch: launchDate ? `${launchDate}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z',
    intlDesignator: row.OBJECT_ID ? String(row.OBJECT_ID).trim() : undefined,
    objectType: inferObjectType(row.OBJECT_TYPE, name, 'celestrak-satcat'),
    opsStatusCode: row.OPS_STATUS_CODE ? String(row.OPS_STATUS_CODE).trim() : undefined,
    owner: row.OWNER ? String(row.OWNER).trim() : undefined,
    launchDate: launchDate || undefined,
    decayDate: decayDate || undefined,
    sourceGroups: [chunkId],
    sourceFeeds: ['satcat.csv'],
    sourceProvider: 'celestrak-satcat',
    sourcePriority: SOURCE_PRIORITY['celestrak-satcat'],
    elementSource: 'none',
    propagatable: false,
  };
}

function enrichLegacyObject(record, meta, chunkId, source) {
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

function sourceDescriptor(provider, feed, elementSource) {
  return {
    provider,
    feed,
    elementSource,
    priority: SOURCE_PRIORITY[provider] ?? 0,
  };
}

async function buildChunkCandidates(chunk, headers) {
  if (chunk.satcatFull) {
    const candidates = new Map();
    const csvText = await fetchText('https://celestrak.org/pub/satcat.csv', headers);
    for (const row of parseCsvObjects(csvText)) {
      const object = satcatRowToKnownObject(row, chunk.id);
      if (object) mergeIntoMap(candidates, object);
    }
    return candidates;
  }

  const candidates = new Map();
  const gpById = new Map();
  const tleById = new Map();
  const metaById = new Map();
  let okGroups = 0;

  for (const group of chunk.groups) {
    try {
      try {
        const gpRecords = await fetchJson(
          `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`,
          headers,
        );
        for (const record of gpRecords ?? []) {
          const id = Number(record.NORAD_CAT_ID);
          if (!Number.isFinite(id) || gpById.has(id)) continue;
          gpById.set(id, record);
        }
      } catch (gpError) {
        console.warn(
          `[catalog] ${chunk.id}/${group} GP JSON failed: ${gpError instanceof Error ? gpError.message : gpError}`,
        );
        const tleText = await tryFetchText(
          [
            `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`,
            ...(TLE_FALLBACKS[group] ?? []),
          ],
          headers,
        );
        for (const record of parseTleText(
          tleText,
          sourceDescriptor(
            TLE_FALLBACKS[group] ? 'spacemap-bundled-tle' : 'celestrak-tle',
            group,
            'tle',
          ),
        )) {
          if (!tleById.has(record.noradId)) tleById.set(record.noradId, record);
        }
      }

      try {
        const metaRecords = await fetchJson(
          `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=JSON`,
          headers,
        );
        for (const record of metaRecords ?? []) {
          const id = Number(record.NORAD_CAT_ID);
          if (!Number.isFinite(id) || metaById.has(id)) continue;
          metaById.set(id, record);
        }
      } catch (metaError) {
        console.warn(
          `[catalog] ${chunk.id}/${group} metadata failed: ${metaError instanceof Error ? metaError.message : metaError}`,
        );
      }
      okGroups++;
    } catch (err) {
      console.warn(
        `[catalog] ${chunk.id}/${group} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (okGroups === 0 && chunk.id === 'core') {
    throw new Error('core public catalog fetch failed');
  }

  for (const record of gpById.values()) {
    const object = buildObject(
      record,
      metaById.get(Number(record.NORAD_CAT_ID)),
      chunk.id,
      sourceDescriptor('celestrak-gp', chunk.id, 'gp'),
    );
    if (object) mergeIntoMap(candidates, object);
  }

  for (const record of tleById.values()) {
    if (gpById.has(record.noradId)) continue;
    mergeIntoMap(
      candidates,
      enrichLegacyObject(
        record,
        metaById.get(record.noradId),
        chunk.id,
        sourceDescriptor(record.sourceProvider ?? 'celestrak-tle', chunk.id, 'tle'),
      ),
    );
  }

  for (const file of chunk.supplementalFiles ?? []) {
    try {
      const supRecords = await fetchJson(
        `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=${encodeURIComponent(file)}&FORMAT=json`,
        headers,
      );
      for (const record of supRecords ?? []) {
        const object = buildObject(
          record,
          metaById.get(Number(record.NORAD_CAT_ID)),
          chunk.id,
          sourceDescriptor('celestrak-supgp', `sup:${file}`, 'supgp'),
        );
        if (object) mergeIntoMap(candidates, object);
      }
    } catch (err) {
      console.warn(
        `[catalog] ${chunk.id}/sup:${file} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return candidates;
}

async function main() {
  const outputDir = path.resolve(process.argv[2] ?? 'frontend/dist/data');
  const ua =
    process.env.UA ??
    'SpaceMap/1.0 (+https://github.com/codehost-commit/spacemap-website)';
  const headers = { 'User-Agent': ua };

  await mkdir(outputDir, { recursive: true });

  const manifest = {
    fetchedAt: Date.now(),
    totalCount: 0,
    propagatableCount: 0,
    metadataOnlyCount: 0,
    chunks: [],
  };

  const ownerChunkById = new Map();
  const globalById = new Map();

  for (const chunk of CHUNKS) {
    const candidates = await buildChunkCandidates(chunk, headers);
    for (const [noradId, record] of candidates) {
      if (!ownerChunkById.has(noradId)) ownerChunkById.set(noradId, chunk.id);
      mergeIntoMap(globalById, record);
    }
  }

  for (const chunk of CHUNKS) {
    const objects = Array.from(globalById.values())
      .filter((record) => ownerChunkById.get(record.noradId) === chunk.id)
      .sort((a, b) => a.noradId - b.noradId);
    const propagatableCount = objects.filter((record) => record.propagatable !== false).length;
    const chunkFile = {
      id: chunk.id,
      label: chunk.label,
      count: objects.length,
      propagatableCount,
      objects,
    };
    const fileName = `catalog-${chunk.id}.json`;
    await writeFile(path.join(outputDir, fileName), JSON.stringify(chunkFile));
    manifest.chunks.push({
      id: chunk.id,
      label: chunk.label,
      count: objects.length,
      propagatableCount,
      path: `data/${fileName}`,
    });
    manifest.totalCount += objects.length;
    manifest.propagatableCount += propagatableCount;
    console.log(
      `[catalog] ${chunk.id}: ${objects.length.toLocaleString()} objects (${propagatableCount.toLocaleString()} propagatable)`,
    );
  }

  manifest.metadataOnlyCount = Math.max(0, manifest.totalCount - manifest.propagatableCount);

  await writeFile(path.join(outputDir, 'catalog-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(
    `[catalog] total bundled public objects: ${manifest.totalCount.toLocaleString()} (${manifest.propagatableCount.toLocaleString()} propagatable)`,
  );
}

await main();
