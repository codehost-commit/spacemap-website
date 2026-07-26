/**
 * Offline propagator smoke test. Runs a known-good ISS TLE through the
 * pipeline and prints the propagated state so you can sanity-check the
 * propagator without needing network access to CelesTrak.
 *
 * Run with:  npm run smoke -w backend
 */
import { parseTleText } from "./tle/parse.js";
import { Propagator } from "./propagation/propagator.js";
import { TleCatalog } from "./tle/catalog.js";
import type { Tle } from "@spacemap/shared";

const iss = `ISS (ZARYA)
1 25544U 98067A   24170.75000000  .00016717  00000+0  30571-3 0  9994
2 25544  51.6412 213.1946 0009873  54.5312  63.2500 15.49913225 12345`;

const tles = parseTleText(iss);
console.log(`Parsed ${tles.length} TLE(s): ${tles[0]?.name} (${tles[0]?.noradId})`);

const catalog = new TleCatalog();
// Directly seed the in-memory catalog to bypass the network.
type CatalogInternals = { tles: Map<number, Tle>; listeners: Set<(t: Tle[]) => void> };
const internals = catalog as unknown as CatalogInternals;
internals.tles = new Map(tles.map((t) => [t.noradId, t]));
for (const l of internals.listeners) l(tles);

const propagator = new Propagator(catalog);
// Propagator was constructed against an empty catalog; force a rebuild.
(propagator as unknown as { rebuild: (t: Tle[]) => void }).rebuild(tles);

const at = new Date("2024-06-19T00:00:00Z");
console.log("State:", propagator.propagate(25544, at));
const telemetry = propagator.telemetry(25544, at);
console.log("Elements:", telemetry?.elements);
console.log("Sunlit:", telemetry?.sunlit);
console.log("Relativistic offset (s):", telemetry?.relativisticOffsetSec);
