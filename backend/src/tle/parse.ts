import type { Tle } from "@spacemap/shared";

/**
 * Parse a CelesTrak-style 3-line TLE text blob (name, line1, line2 repeating).
 * Returns valid TLEs only; malformed groups are logged and skipped.
 */
export function parseTleText(text: string): Tle[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const out: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) {
      // Not aligned to a 3-line group — try to resync by consuming one line.
      i -= 2;
      continue;
    }
    const noradId = Number(l1.slice(2, 7).trim());
    if (!Number.isFinite(noradId)) continue;
    out.push({
      noradId,
      name,
      line1: l1,
      line2: l2,
      epoch: parseTleEpoch(l1),
    });
  }
  return out;
}

/** Extract the ISO epoch from TLE line 1. Columns 19-32 hold YYDDD.DDDDDDDD. */
function parseTleEpoch(line1: string): string {
  const yy = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return new Date().toISOString();
  const fullYear = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return new Date(ms).toISOString();
}
