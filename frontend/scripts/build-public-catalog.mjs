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
    id: 'debris',
    label: 'Tracked debris',
    groups: ['cosmos-2251-debris', 'fengyun-1c-debris', 'iridium-33-debris'],
  },
];

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

function parseTleText(text) {
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
      objectType: 'unknown',
      sourceGroups: ['legacy-tle'],
    });
  }
  return out;
}

function parseTleEpoch(line1) {
  const yy = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return new Date().toISOString();
  const fullYear = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86400000;
  return new Date(ms).toISOString();
}

function buildObject(gp, meta, group) {
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

function enrichLegacyObject(record, meta, group) {
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

function finiteOrUndefined(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
    chunks: [],
  };
  const seenGlobal = new Set();

  for (const chunk of CHUNKS) {
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
          for (const record of parseTleText(tleText)) {
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

    const objects = Array.from(gpById.values())
      .map((record) => buildObject(record, metaById.get(Number(record.NORAD_CAT_ID)), chunk.id))
      .filter(Boolean)
      .concat(
        Array.from(tleById.values())
          .filter((record) => !gpById.has(record.noradId))
          .map((record) => enrichLegacyObject(record, metaById.get(record.noradId), chunk.id)),
      )
      .filter((record) => {
        if (seenGlobal.has(record.noradId)) return false;
        seenGlobal.add(record.noradId);
        return true;
      })
      .sort((a, b) => a.noradId - b.noradId);

    const chunkFile = {
      id: chunk.id,
      label: chunk.label,
      count: objects.length,
      objects,
    };
    const fileName = `catalog-${chunk.id}.json`;
    await writeFile(path.join(outputDir, fileName), JSON.stringify(chunkFile));
    manifest.chunks.push({
      id: chunk.id,
      label: chunk.label,
      count: objects.length,
      path: `data/${fileName}`,
    });
    manifest.totalCount += objects.length;
    console.log(`[catalog] ${chunk.id}: ${objects.length.toLocaleString()} objects`);
  }

  await writeFile(path.join(outputDir, 'catalog-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[catalog] total bundled public objects: ${manifest.totalCount.toLocaleString()}`);
}

await main();
