const LL2_BASE = "https://ll.thespacedevs.com/2.3.0/launches";
const REVALIDATE_SECONDS = 60 * 30;

// Typical current Starlink batch size, used only when a launch's mission
// description doesn't state a count. Recent batches have ranged ~21-28
// depending on orbital shell/satellite generation; this is a labeled
// estimate, never presented as an exact figure.
const ESTIMATED_BATCH_SIZE = 24;

export interface LaunchSummary {
  id: string;
  name: string;
  net: string; // ISO datetime of scheduled/actual liftoff
  statusName: string;
  missionDescription: string | null;
  satelliteCount: number;
  satelliteCountIsEstimate: boolean;
}

interface Ll2Result {
  id: string;
  name: string;
  net: string;
  status: { name: string };
  mission: { description: string | null } | null;
}

interface Ll2Response {
  results: Ll2Result[];
}

function parseSatelliteCount(description: string | null): number | null {
  if (!description) return null;
  const match = /(\d{1,3})\s+(?:Starlink\s+)?satellites/i.exec(description);
  if (!match) return null;
  return Number(match[1]);
}

async function fetchLaunches(
  path: "upcoming" | "previous",
  limit: number,
): Promise<LaunchSummary[]> {
  const ordering = path === "previous" ? "&ordering=-net" : "";
  const url = `${LL2_BASE}/${path}/?search=starlink&limit=${limit}${ordering}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return [];

  const data: Ll2Response = await res.json();
  return data.results.map((r) => {
    const description = r.mission?.description ?? null;
    const parsedCount = parseSatelliteCount(description);
    return {
      id: r.id,
      name: r.name,
      net: r.net,
      statusName: r.status.name,
      missionDescription: description,
      satelliteCount: parsedCount ?? ESTIMATED_BATCH_SIZE,
      satelliteCountIsEstimate: parsedCount === null,
    };
  });
}

export async function getUpcomingStarlinkLaunches(limit = 5) {
  return fetchLaunches("upcoming", limit);
}

export async function getRecentStarlinkLaunches(limit = 5) {
  return fetchLaunches("previous", limit);
}
