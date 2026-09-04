import { promises as fs } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

// NHTSA's Standing General Order (SGO) 2021-01 requires every company
// testing/deploying SAE Level 3+ automated driving systems (ADS) on public
// roads to report crashes here — no auth/key required, genuinely live and
// public, unlike the rest of the Robotaxi tab's mostly-static data (see
// lib/data/robotaxiStatic.ts). This is the ADS dataset specifically (not the
// separate ADAS.csv, which covers Level 2 driver-assist systems like
// consumer FSD) — filtering `Reporting Entity === "Tesla, Inc."` here
// isolates Tesla's actual autonomous/robotaxi program, confirmed against a
// real downloaded copy of the CSV (44 Tesla rows, all Model Y, all in
// Austin/Dallas/Houston TX, "Driver / Operator Type" of "None" for driverless
// operation vs "In-Vehicle (Commercial / Test)"/"Remote (Commercial / Test)"
// for supervised/teleoperated runs) — no narrative-text guessing needed.
const NHTSA_ADS_CSV_URL =
  "https://static.nhtsa.gov/odi/ffdd/sgo-2021-01/SGO-2021-01_Incident_Reports_ADS.csv";

const TESLA_REPORTING_ENTITY = "Tesla, Inc.";

// NHTSA republishes this dataset roughly monthly; daily is generous and
// matches the disk-cache/coalescing pattern in lib/data/celestrak.ts.
const REVALIDATE_SECONDS = 60 * 60 * 24;
const FAILURE_RETRY_SECONDS = 60 * 60;

export interface RobotaxiIncident {
  reportId: string;
  incidentDate: string; // e.g. "JUN-2026", as NHTSA reports it (month granularity)
  city: string;
  state: string;
  driverOperatorType: string; // "None" (driverless) | "In-Vehicle (Commercial / Test)" | "Remote (Commercial / Test)"
  severity: string;
  narrative: string;
}

export interface RobotaxiIncidentSummary {
  totalIncidents: number;
  byMonth: { month: string; count: number }[];
  byCity: { city: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  remoteOperatorIncidents: number;
  driverlessIncidents: number;
  latestIncident: RobotaxiIncident | null;
  fetchedAt: string;
}

export interface RobotaxiIncidentData {
  summary: RobotaxiIncidentSummary;
  incidents: RobotaxiIncident[];
}

function monthSortKey(month: string): number {
  const [mon, year] = month.split("-");
  const idx = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(mon);
  return Number(year) * 12 + (idx === -1 ? 0 : idx);
}

function summarize(incidents: RobotaxiIncident[]): RobotaxiIncidentSummary {
  const monthCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();
  let remoteOperatorIncidents = 0;
  let driverlessIncidents = 0;

  for (const incident of incidents) {
    monthCounts.set(incident.incidentDate, (monthCounts.get(incident.incidentDate) ?? 0) + 1);
    const cityLabel = `${incident.city}, ${incident.state}`;
    cityCounts.set(cityLabel, (cityCounts.get(cityLabel) ?? 0) + 1);
    severityCounts.set(incident.severity, (severityCounts.get(incident.severity) ?? 0) + 1);
    if (incident.driverOperatorType.startsWith("Remote")) remoteOperatorIncidents += 1;
    if (incident.driverOperatorType === "None") driverlessIncidents += 1;
  }

  const byMonth = [...monthCounts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
  const byCity = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
  const bySeverity = [...severityCounts.entries()].map(([severity, count]) => ({ severity, count }));

  const latestIncident =
    incidents.length === 0
      ? null
      : [...incidents].sort((a, b) => monthSortKey(b.incidentDate) - monthSortKey(a.incidentDate))[0];

  return {
    totalIncidents: incidents.length,
    byMonth,
    byCity,
    bySeverity,
    remoteOperatorIncidents,
    driverlessIncidents,
    latestIncident,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromNhtsa(): Promise<RobotaxiIncidentData> {
  const res = await fetch(NHTSA_ADS_CSV_URL);
  if (!res.ok) {
    throw new Error(`NHTSA SGO request failed: ${res.status}`);
  }

  const csvText = await res.text();
  // Narrative fields contain embedded commas/newlines inside quotes — this
  // needs a real RFC-4180 parser, not a naive split(","). Never ship the raw
  // multi-MB CSV to the client; filter down to Tesla rows server-side first.
  const rows: Record<string, string>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    throw new Error("NHTSA SGO CSV parsed to zero rows");
  }

  const incidents: RobotaxiIncident[] = rows
    .filter((row) => row["Reporting Entity"] === TESLA_REPORTING_ENTITY)
    .map((row) => ({
      reportId: row["Report ID"] ?? "",
      incidentDate: row["Incident Date"] ?? "",
      city: row["City"] ?? "",
      state: row["State"] ?? "",
      driverOperatorType: row["Driver / Operator Type"] ?? "",
      severity: row["Highest Injury Severity Alleged"] ?? "",
      narrative: row["Narrative"] ?? "",
    }));

  return { summary: summarize(incidents), incidents };
}

// --- Disk-backed guard -----------------------------------------------------
// Same reasoning and structure as lib/data/celestrak.ts: persist the last
// good parse across `next dev` restarts, cap retry frequency independent of
// process state, and fail open by serving the last known-good snapshot
// instead of a blank panel. Best-effort in production (serverless fs isn't
// reliably writable/persistent) — every fs call below fails silently and
// falls through to a live fetch.
const DISK_CACHE_FILE = path.join(process.cwd(), ".cache", "robotaxi-nhtsa-data.json");

interface DiskCacheEntry {
  data?: RobotaxiIncidentData;
  lastAttemptAt: number;
  lastSuccessAt?: number;
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

async function fetchRobotaxiDataDiskGuarded(): Promise<RobotaxiIncidentData> {
  const cached = await readDiskCache();
  const now = Date.now();

  const dataStillFresh =
    cached?.lastSuccessAt !== undefined && now - cached.lastSuccessAt < REVALIDATE_SECONDS * 1000;
  const attemptedTooRecently =
    cached !== null && now - cached.lastAttemptAt < FAILURE_RETRY_SECONDS * 1000;

  if (dataStillFresh || attemptedTooRecently) {
    if (cached?.data) return cached.data;
    throw new Error(
      "Skipping fetch: a recent attempt already failed and the retry window hasn't elapsed",
    );
  }

  try {
    const fresh = await fetchFromNhtsa();
    await writeDiskCache({ data: fresh, lastAttemptAt: now, lastSuccessAt: now });
    return fresh;
  } catch (err) {
    await writeDiskCache({ data: cached?.data, lastAttemptAt: now, lastSuccessAt: cached?.lastSuccessAt });
    if (cached?.data) return cached.data;
    throw err;
  }
}

// --- In-memory request coalescing ------------------------------------------
// Same reasoning as celestrak.ts: coalesce concurrent/rapid calls within a
// single warm process. The parsed/filtered payload here is small (tens of
// rows, not thousands), so unlike celestrak.ts there's no Next Data Cache
// 2MB-entry-size concern — this file just reuses the same disk-cache
// structure for consistency and to share the "no database" persistence story.
let inMemoryCache: { promise: Promise<RobotaxiIncidentData>; expiresAt: number } | null = null;

function fetchRobotaxiDataGuarded(): Promise<RobotaxiIncidentData> {
  const now = Date.now();
  if (inMemoryCache && now < inMemoryCache.expiresAt) {
    return inMemoryCache.promise;
  }

  const promise = fetchRobotaxiDataDiskGuarded();
  inMemoryCache = { promise, expiresAt: now + REVALIDATE_SECONDS * 1000 };
  promise.catch(() => {
    if (inMemoryCache?.promise === promise) inMemoryCache = null;
  });
  return promise;
}

export async function getRobotaxiIncidentData(): Promise<RobotaxiIncidentData | null> {
  try {
    return await fetchRobotaxiDataGuarded();
  } catch {
    return null;
  }
}
