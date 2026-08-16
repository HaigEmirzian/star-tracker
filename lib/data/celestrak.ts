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
// This is the sole persistence/throttling layer for CelesTrak requests (see
// the in-memory coalescing comment further below for why it's no longer
// paired with `unstable_cache` — the payload outgrew Next's Data Cache
// 2MB-per-entry limit). Locally, `next dev` has no other persistence, so
// without this, repeated dev-server restarts would re-hit CelesTrak's live
// endpoint far more than its ~2-hour update cadence and trip its rate
// limit. This file-based layer persists the last successful snapshot across
// restarts, and refuses to even attempt a network call more often than
// REVALIDATE_SECONDS regardless of process state.
//
// In production this is best-effort — Vercel's serverless filesystem isn't
// reliably writable/persistent across invocations, so every fs call below is
// wrapped to fail silently and fall through to a live fetch. The in-memory
// cache below still coalesces requests within a warm instance either way.
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

async function fetchStarlinkDataDiskGuarded(): Promise<StarlinkData> {
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

// --- In-memory request coalescing ------------------------------------------
//
// This used to also be wrapped in `unstable_cache` to persist across
// deploys/invocations via Next's Data Cache. That broke once the
// constellation grew past ~7,000 satellites: the raw entries payload now
// runs 5MB+, and Next's Data Cache hard-caps every entry at 2MB (enforced in
// next/dist/server/lib/incremental-cache regardless of which caching API you
// use — unstable_cache, fetch's `next.revalidate`, all the same limit)
// unless a custom cache handler is installed. In dev that throws and crashes
// the request; in prod it would silently stop caching and start re-hitting
// CelesTrak on every request, tripping its throttle almost immediately.
//
// The disk-cache guard above already does the real work — unbounded size,
// persists across dev restarts, and enforces the ~2-hour throttle window
// independent of any Next.js cache. This in-memory promise just coalesces
// concurrent/rapid calls within a single warm process so we're not hitting
// the filesystem (or CelesTrak) on every request. It doesn't survive cold
// starts on serverless, but neither did the disk cache in production (see
// its comment above) — this is a strict improvement with no worse a
// production ceiling than before, and it doesn't crash.
let inMemoryCache: { promise: Promise<StarlinkData>; expiresAt: number } | null = null;

function fetchStarlinkDataGuarded(): Promise<StarlinkData> {
  const now = Date.now();
  if (inMemoryCache && now < inMemoryCache.expiresAt) {
    return inMemoryCache.promise;
  }

  const promise = fetchStarlinkDataDiskGuarded();
  inMemoryCache = { promise, expiresAt: now + REVALIDATE_SECONDS * 1000 };
  // Don't hold onto a rejected promise as the "cached" value — let the next
  // call retry (the disk-cache guard's own lastAttemptAt window still
  // protects CelesTrak from being hit too often across that retry).
  promise.catch(() => {
    if (inMemoryCache?.promise === promise) inMemoryCache = null;
  });
  return promise;
}

export async function getStarlinkData(): Promise<StarlinkData | null> {
  try {
    return await fetchStarlinkDataGuarded();
  } catch {
    // No successful fetch has ever completed yet (e.g. moments after a
    // fresh deploy, with no disk cache either) — nothing to fall back to.
    return null;
  }
}
