import { promises as fs } from "fs";
import path from "path";
import type {
  FleetHistoryPoint,
  FleetOperator,
  TxdmvFleetData,
} from "@/lib/data/txdmvFleetTypes";

// Live registered-fleet counts for every autonomous-vehicle operator
// authorised in Texas.
//
// Texas SB 2807 obliges anyone running driverless vehicles on public roads to
// register each one with the TxDMV, which makes this the ONLY count of Tesla's
// robotaxi fleet with a legal reporting obligation behind it — everything else
// in circulation is a crowdsourced sighting tally. FSD Database polls the
// TxDMV "Automated Motor Vehicle Operator Lookup" and republishes it as JSON,
// with a daily history we could not otherwise reconstruct (we have no database
// to accumulate our own snapshots in — see the no-database rule in CLAUDE.md).
//
// Registrations are not vehicles in service: Tesla does not disclose how many
// of these actually carry passengers, and the UI must say so wherever this
// number appears.
//
// What this deliberately does NOT do is scrape the licence plates and VINs
// that FSD Database also publishes. Those are crowdsourced from ride receipts,
// live only in their page's HTML rather than this feed, and keeping a
// per-vehicle registry current would need exactly the scraper-plus-database
// this project doesn't run. Link to their tracker instead of half-copying it.
const FEED_URL = "https://fsddb.com/robotaxi.json?service=tesla-robotaxi";

const SOURCE_LABEL = "FSD Database, from the TxDMV Automated Motor Vehicle Operator Lookup";
const SOURCE_URL = "https://fsddb.com/robotaxi?service=tesla-robotaxi";

const TESLA_OPERATOR = "Tesla Robotaxi";

// The upstream registry refreshes every ~5 minutes; hourly is plenty for a
// figure that moves a few vehicles a day, and stays polite.
const REVALIDATE_SECONDS = 60 * 60;
const FAILURE_RETRY_SECONDS = 5 * 60;
// page.tsx awaits this inside its Promise.all, so it sits on the SSR critical
// path and must never hang a render.
const FETCH_TIMEOUT_MS = 8_000;

// --- Parsing ---------------------------------------------------------------
// Everything below treats the payload as untrusted: each field is type-checked
// before use, and anything malformed degrades to null/0 rather than throwing
// somewhere deep in a component.

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function toModels(v: unknown): Record<string, number> {
  if (typeof v !== "object" || v === null) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function toOperator(raw: unknown): FleetOperator | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const name = str(o.name);
  if (!name) return null;
  return {
    name,
    fleetSize: num(o.fleet_size),
    change7d: num(o.change_7d),
    change30d: num(o.change_30d),
    growth30dPct: num(o.growth_30d_pct),
    models: toModels(o.models),
    complaints: num(o.complaints),
    registryUrl: str(o.txdmv_url),
  };
}

function toHistory(raw: unknown): FleetHistoryPoint[] {
  if (typeof raw !== "object" || raw === null) return [];
  const fh = raw as Record<string, unknown>;
  const labels = Array.isArray(fh.labels) ? fh.labels : [];
  const series = Array.isArray(fh.series) ? fh.series : [];

  const tesla = series.find((s) => {
    if (typeof s !== "object" || s === null) return false;
    return str((s as Record<string, unknown>).label) === TESLA_OPERATOR;
  }) as Record<string, unknown> | undefined;

  const data = Array.isArray(tesla?.data) ? tesla.data : [];
  const points: FleetHistoryPoint[] = [];
  for (let i = 0; i < Math.min(labels.length, data.length); i += 1) {
    const label = str(labels[i]);
    const count = data[i];
    if (label && typeof count === "number" && Number.isFinite(count)) {
      points.push({ label, count });
    }
  }
  return points;
}

async function fetchFromFeed(): Promise<TxdmvFleetData> {
  const res = await fetch(FEED_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "star-tracker/1.0 (+https://github.com/HaigEmirzian/star-tracker)",
    },
  });
  if (!res.ok) throw new Error(`TxDMV feed request failed: ${res.status}`);

  const json: unknown = await res.json();
  if (typeof json !== "object" || json === null) throw new Error("TxDMV feed was not an object");
  const root = json as Record<string, unknown>;

  const operators = (Array.isArray(root.operators) ? root.operators : [])
    .map(toOperator)
    .filter((o): o is FleetOperator => o !== null)
    .sort((a, b) => b.fleetSize - a.fleetSize);

  if (operators.length === 0) throw new Error("TxDMV feed listed no operators");

  const tesla = operators.find((o) => o.name === TESLA_OPERATOR) ?? null;
  if (!tesla) throw new Error("TxDMV feed did not list Tesla Robotaxi");

  return {
    tesla,
    operators,
    history: toHistory(root.fleet_history),
    totalActiveVehicles: num(root.total_active_vehicles),
    generatedAt: str(root.generated_at) ?? new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    sourceLabel: SOURCE_LABEL,
    sourceUrl: SOURCE_URL,
  };
}

// --- Disk-backed guard -----------------------------------------------------
// Same shape and reasoning as nhtsaRobotaxi.ts / robotaxiNews.ts: survive dev
// restarts, cap retry frequency independent of process state, and fail open to
// the last good snapshot rather than blanking the panel. Best-effort in
// production, where the filesystem is ephemeral.
const DISK_CACHE_FILE = path.join(process.cwd(), ".cache", "txdmv-fleet.v1.json");

interface DiskCacheEntry {
  data?: TxdmvFleetData;
  lastAttemptAt: number;
  lastSuccessAt?: number;
}

async function readDiskCache(): Promise<DiskCacheEntry | null> {
  try {
    return JSON.parse(await fs.readFile(DISK_CACHE_FILE, "utf-8")) as DiskCacheEntry;
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

async function fetchDiskGuarded(): Promise<TxdmvFleetData> {
  const cached = await readDiskCache();
  const now = Date.now();

  const dataStillFresh =
    cached?.lastSuccessAt !== undefined && now - cached.lastSuccessAt < REVALIDATE_SECONDS * 1000;
  const attemptedTooRecently =
    cached !== null && now - cached.lastAttemptAt < FAILURE_RETRY_SECONDS * 1000;

  if (dataStillFresh || attemptedTooRecently) {
    if (cached?.data) return cached.data;
    throw new Error("Skipping fetch: a recent attempt failed and the retry window hasn't elapsed");
  }

  try {
    const fresh = await fetchFromFeed();
    await writeDiskCache({ data: fresh, lastAttemptAt: now, lastSuccessAt: now });
    return fresh;
  } catch (err) {
    await writeDiskCache({
      data: cached?.data,
      lastAttemptAt: now,
      lastSuccessAt: cached?.lastSuccessAt,
    });
    if (cached?.data) return cached.data;
    throw err;
  }
}

// --- In-memory request coalescing ------------------------------------------
let inMemoryCache: { promise: Promise<TxdmvFleetData>; expiresAt: number } | null = null;

function fetchGuarded(): Promise<TxdmvFleetData> {
  const now = Date.now();
  if (inMemoryCache && now < inMemoryCache.expiresAt) return inMemoryCache.promise;

  const promise = fetchDiskGuarded();
  inMemoryCache = { promise, expiresAt: now + REVALIDATE_SECONDS * 1000 };
  promise.catch(() => {
    if (inMemoryCache?.promise === promise) inMemoryCache = null;
  });
  return promise;
}

export async function getTxdmvFleetData(): Promise<TxdmvFleetData | null> {
  try {
    return await fetchGuarded();
  } catch {
    return null;
  }
}
