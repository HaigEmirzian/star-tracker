import { unstable_cache } from "next/cache";

const STARLINK_GP_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json";

// CelesTrak throttles repeat requests per-dataset (returns a plain-text
// "GP data has not updated..." message instead of JSON) if hit too often.
// Revalidate window keeps us well under that.
const REVALIDATE_SECONDS = 60 * 60 * 2;

export interface StarlinkGpEntry {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  NORAD_CAT_ID: number;
}

export interface StarlinkSummary {
  totalActive: number;
  shells: { label: string; count: number }[];
  cumulativeByLaunchYear: { year: number; cumulativeActive: number }[];
  orbitsPerDay: number;
  fetchedAt: string;
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

async function fetchStarlinkSummary(): Promise<StarlinkSummary> {
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

// Wrapped in unstable_cache so that when CelesTrak throttles us (common —
// it only allows updates once every ~2 hours per dataset), Next.js keeps
// serving the last successful snapshot instead of the page going blank.
// Because fetchStarlinkSummary throws on failure rather than returning a
// value, a failed background revalidation never overwrites the cached
// good data — Next just retries on the next request after the window.
// Note: this relies on Vercel's persistent Data Cache in production; in
// local `next dev`, a server restart clears it, so a throttled first call
// after restart will have nothing to fall back to yet.
const getCachedStarlinkSummary = unstable_cache(
  fetchStarlinkSummary,
  ["starlink-summary"],
  { revalidate: REVALIDATE_SECONDS },
);

export async function getStarlinkSummary(): Promise<StarlinkSummary | null> {
  try {
    return await getCachedStarlinkSummary();
  } catch {
    // No successful fetch has ever completed yet (e.g. moments after a
    // fresh deploy) — nothing to fall back to.
    return null;
  }
}
