import { unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";

const STARLINK_GP_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json";

// CelesTrak throttles repeat requests per-dataset (returns a plain-text
// "GP data has not updated..." message instead of JSON) if hit too often.
// This is also roughly how often the underlying data actually changes, so
// there's never a reason to attempt a fetch more often than this — see the
// disk-cache guard below, which enforces that independent of Next's own
// cache (which resets on every local `next dev` restart).
const REVALIDATE_SECONDS = 60 * 60 * 2;

// Matches CelesTrak's OMM/JSON GP format, which is also exactly the shape
// satellite.js's json2satrec() expects — so the same fetch/parse feeds both
// the summary stats below and the live 3D globe (StarlinkGlobe.tsx) with no
// second request needed.
export interface StarlinkGpEntry {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  // CelesTrak includes a few more OMM fields we don't otherwise use
  // (CLASSIFICATION_TYPE, EPHEMERIS_TYPE, etc.); this keeps the type
  // structurally assignable to satellite.js's OMMJsonObject without
  // enumerating every one.
  [key: string]: unknown;
}

export interface StarlinkSummary {
  totalActive: number;
  shells: { label: string; count: number }[];
  cumulativeByLaunchYear: { year: number; cumulativeActive: number }[];
  orbitsPerDay: number;
  fetchedAt: string;
}

export interface StarlinkData {
  summary: StarlinkSummary;
  entries: StarlinkGpEntry[];
}

// OBJECT_ID is the international launch designator, e.g. "2019-074B" ->
// launched in 2019. Used to reconstruct a "currently-active satellites by
// launch year" trend from a single live snapshot, with no need to persist
// our own historical data. Undercounts true historical launch totals since
// decommissioned satellites drop out of the active list, but it's a real
// derived-from-live-data growth curve, not a fabricated one.
function launchYearFromObjectId(objectId: string): number | null {
  const match = /^(\d{4})-\d{3}/.exec(objectId);
  if (!match) return null;
  return Number(match[1]);
}

// Mean motion (revs/day) -> approximate circular-orbit altitude (km).
function meanMotionToAltitudeKm(meanMotionRevPerDay: number): number {
  const MU_EARTH = 398600.4418; // km^3/s^2
  const EARTH_RADIUS_KM = 6378.137;
  const n = (meanMotionRevPerDay * 2 * Math.PI) / 86400; // rad/s
  const semiMajorAxisKm = Math.cbrt(MU_EARTH / (n * n));
  return semiMajorAxisKm - EARTH_RADIUS_KM;
}

function shellLabelForAltitude(altitudeKm: number): string {
  if (altitudeKm < 400) return "<400 km";
  if (altitudeKm < 500) return "400-500 km";
  if (altitudeKm < 550) return "500-550 km";
  if (altitudeKm < 570) return "550-570 km";
  return "570+ km";
}

function summarize(entries: StarlinkGpEntry[]): StarlinkSummary {
  const shellCounts = new Map<string, number>();
  let totalMeanMotion = 0;
  for (const entry of entries) {
    const altitudeKm = meanMotionToAltitudeKm(entry.MEAN_MOTION);
    const label = shellLabelForAltitude(altitudeKm);
    shellCounts.set(label, (shellCounts.get(label) ?? 0) + 1);
    totalMeanMotion += entry.MEAN_MOTION;
  }

  const shellOrder = ["<400 km", "400-500 km", "500-550 km", "550-570 km", "570+ km"];
  const shells = shellOrder
    .filter((label) => shellCounts.has(label))
    .map((label) => ({ label, count: shellCounts.get(label)! }));

  const yearCounts = new Map<number, number>();
  for (const entry of entries) {
    const year = launchYearFromObjectId(entry.OBJECT_ID);
    if (year === null) continue;
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }
  const sortedYears = [...yearCounts.keys()].sort((a, b) => a - b);
  let running = 0;
  const cumulativeByLaunchYear = sortedYears.map((year) => {
    running += yearCounts.get(year)!;
    return { year, cumulativeActive: running };
  });

  return {
    totalActive: entries.length,
    shells,
    cumulativeByLaunchYear,
    orbitsPerDay: totalMeanMotion,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromCelesTrak(): Promise<StarlinkData> {
  const res = await fetch(STARLINK_GP_URL, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`CelesTrak request failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    // CelesTrak returned its throttle message instead of data.
    throw new Error("CelesTrak throttled this request (non-JSON response)");
  }

  const entries: StarlinkGpEntry[] = await res.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("CelesTrak returned an empty dataset");
  }

  return { summary: summarize(entries), entries };
}

// --- Disk-backed guard -----------------------------------------------------
//
// Next's `unstable_cache` (below) is the real persistence layer in
// production — Vercel's Data Cache survives across requests and
// deployments. Locally, though, `next dev` clears that cache on every
// restart, so repeated restarts during development were re-hitting
// CelesTrak's live endpoint far more than its ~2-hour update cadence and
// tripping its rate limit. This file-based layer fixes both problems for
// local dev: it persists the last successful snapshot across restarts, and
// it refuses to even attempt a network call more often than
// REVALIDATE_SECONDS regardless of Next's cache state.
//
// In production this is inert by design — Vercel's serverless filesystem
// isn't reliably writable/persistent across invocations, so every fs call
// below is wrapped to fail silently and fall through to a live fetch,
// leaving `unstable_cache` as the sole (and already correct) persistence
// mechanism there.
const DISK_CACHE_FILE = path.join(process.cwd(), ".cache", "starlink-data.json");

interface DiskCacheEntry {
  // Absent until the first successful fetch — but lastAttemptAt is always
  // recorded, even on failure, so the interval guard below still protects
  // CelesTrak from repeated attempts before we've ever had a success.
  data?: StarlinkData;
  lastAttemptAt: number;
}

async function readDiskCache(): Promise<DiskCacheEntry | null> {
  try {
    const raw = await fs.readFile(DISK_CACHE_FILE, "utf-8");
    return JSON.parse(raw) as DiskCacheEntry;
  } catch {
    return null;
  }
}

async function writeDiskCache(entry: DiskCacheEntry): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DISK_CACHE_FILE), { recursive: true });
    await fs.writeFile(DISK_CACHE_FILE, JSON.stringify(entry), "utf-8");
  } catch {
    // Read-only/ephemeral filesystem — fine, see comment above.
  }
}

async function fetchStarlinkDataGuarded(): Promise<StarlinkData> {
  const cached = await readDiskCache();
  const now = Date.now();

  if (cached && now - cached.lastAttemptAt < REVALIDATE_SECONDS * 1000) {
    // Too soon since the last attempt — don't risk another rate-limit hit.
    // Serve the last known-good snapshot if we have one; otherwise there's
    // nothing to fall back to yet, but we still skip the network call.
    if (cached.data) return cached.data;
    throw new Error(
      "Skipping fetch: a recent attempt already failed and the guard window hasn't elapsed",
    );
  }

  // unstable_cache already coalesces concurrent calls for the same key
  // within a process, so no separate "reserve before fetching" step is
  // needed here — just fetch, and always write a complete, valid entry.
  try {
    const fresh = await fetchFromCelesTrak();
    await writeDiskCache({ data: fresh, lastAttemptAt: now });
    return fresh;
  } catch (err) {
    // Always record the attempt, even with no prior data to fall back on —
    // this is what stops repeated dev-server restarts from each re-hitting
    // CelesTrak while we've never yet had a successful fetch.
    await writeDiskCache({ data: cached?.data, lastAttemptAt: now });
    if (cached?.data) return cached.data;
    throw err;
  }
}

const getCachedStarlinkData = unstable_cache(
  fetchStarlinkDataGuarded,
  ["starlink-data"],
  { revalidate: REVALIDATE_SECONDS },
);

export async function getStarlinkData(): Promise<StarlinkData | null> {
  try {
    return await getCachedStarlinkData();
  } catch {
    // No successful fetch has ever completed yet (e.g. moments after a
    // fresh deploy, with no disk cache either) — nothing to fall back to.
    return null;
  }
}
