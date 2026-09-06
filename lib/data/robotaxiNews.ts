import { promises as fs } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import type {
  NewsSourceId,
  NewsSourceStatus,
  NewsTag,
  RobotaxiNewsData,
  RobotaxiNewsItem,
} from "@/lib/data/robotaxiNewsTypes";

// Live news scanner for the Robotaxi tab. Reads publisher RSS feeds directly
// rather than a news API, for three reasons that happen to align:
//
//   - Licensing. RSS is published for headline + link display, which is
//     exactly what this does. Google News' RSS returns 200 but its terms
//     restrict it to personal, non-commercial feed readers, so it is not
//     usable on a deployed site. GDELT's API rate-limited from every IP tried.
//   - Cost. No key, no account, no backing service — same constraint that
//     shapes every other data source in this repo.
//   - Safety. See the sanitisation rules below.
//
// SECURITY — feed content is untrusted third-party input:
//
//   Only four fields ever reach the client: title, link, publishedAt, and a
//   sourceLabel that comes from OUR OWN NEWS_SOURCES table below, never from
//   the feed's <title>. `description`, `content:encoded` and `dc:creator` are
//   never read at all, so there is no untrusted-HTML surface to sanitise in
//   the first place. Titles are tag-stripped and length-capped; links must
//   parse and must be https:. Nothing here may ever be rendered with
//   dangerouslySetInnerHTML.

const NEWS_SOURCES: {
  id: NewsSourceId;
  label: string;
  homepage: string;
  feed: string;
}[] = [
  { id: "electrek", label: "Electrek", homepage: "https://electrek.co", feed: "https://electrek.co/feed/" },
  { id: "teslarati", label: "Teslarati", homepage: "https://www.teslarati.com", feed: "https://www.teslarati.com/feed/" },
  { id: "techcrunch", label: "TechCrunch", homepage: "https://techcrunch.com", feed: "https://techcrunch.com/feed/" },
];

// A news feed that is a day stale reads as broken, so this revalidates far
// more often than the NHTSA dataset (which republishes monthly).
const REVALIDATE_SECONDS = 30 * 60;
const FAILURE_RETRY_SECONDS = 5 * 60;
// page.tsx awaits this inside its Promise.all, so a hung feed host would hang
// every page render. Non-negotiable.
const FEED_TIMEOUT_MS = 8_000;
const MAX_FEED_BYTES = 5_000_000;
const MAX_ITEMS_PER_FEED = 100;
const MAX_ITEMS = 40;
const MAX_AGE_DAYS = 45;
const MAX_TITLE_CHARS = 200;

// Matched against the title only. TechCrunch is a general tech feed, so a
// bare "NHTSA opens probe" would otherwise pull in stories about other
// manufacturers — regulatory hits additionally require a Tesla mention.
const TAG_PATTERNS: { tag: NewsTag; pattern: RegExp; needsTeslaMention: boolean }[] = [
  { tag: "cybercab", pattern: /\bcybercab\b/i, needsTeslaMention: false },
  { tag: "robotaxi", pattern: /\brobotaxis?\b/i, needsTeslaMention: false },
  { tag: "fsd", pattern: /\bfsd\b|full self[- ]driving/i, needsTeslaMention: false },
  {
    tag: "regulatory",
    pattern: /\bnhtsa\b|\bfmvss\b|investigat|probe|recall|regulator|\bdmv\b|permit|lawsuit|subpoena/i,
    needsTeslaMention: true,
  },
];

const TESLA_MENTION = /\btesla\b|\bmusk\b|\bcybercab\b|\brobotaxis?\b/i;

const parser = new XMLParser({
  ignoreAttributes: true,
  // Without this a title of "2026" parses to the number 2026, and a title of
  // "true" to a boolean.
  parseTagValue: false,
  processEntities: true,
  // WordPress feeds routinely double-encode (&amp;#8217;) — XML entity
  // handling alone leaves those visible in the headline.
  htmlEntities: true,
  trimValues: true,
});

// A channel with exactly one <item> parses to an object, not an array.
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// fast-xml-parser hands back an object (not a string) for a tag carrying
// attributes, so every extraction has to prove it got text.
function asText(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

function cleanTitle(raw: unknown): string | null {
  const text = asText(raw);
  if (!text) return null;
  const stripped = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return stripped.length > MAX_TITLE_CHARS
    ? `${stripped.slice(0, MAX_TITLE_CHARS).trimEnd()}…`
    : stripped;
}

// Rejecting every non-https protocol is what blocks javascript: and data:
// URLs — do not relax this to a blocklist.
function cleanLink(raw: unknown): string | null {
  const text = asText(raw);
  if (!text) return null;
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function cleanDate(raw: unknown): string | null {
  const text = asText(raw);
  if (!text) return null;
  const ms = new Date(text).getTime();
  if (Number.isNaN(ms)) return null;
  // A bad feed timestamp would otherwise pin garbage to the top of a
  // newest-first list forever.
  if (ms > Date.now() + 48 * 60 * 60 * 1000) return null;
  if (ms < Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;
  return new Date(ms).toISOString();
}

function classify(title: string): NewsTag[] {
  const mentionsTesla = TESLA_MENTION.test(title);
  const tags: NewsTag[] = [];
  for (const { tag, pattern, needsTeslaMention } of TAG_PATTERNS) {
    if (!pattern.test(title)) continue;
    if (needsTeslaMention && !mentionsTesla) continue;
    tags.push(tag);
  }
  return tags;
}

async function fetchFeed(source: (typeof NEWS_SOURCES)[number]): Promise<RobotaxiNewsItem[]> {
  const res = await fetch(source.feed, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: {
      // Publishers reasonably want to know who is polling them.
      "User-Agent": "star-tracker/1.0 (+https://github.com/HaigEmirzian/star-tracker)",
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const xml = await res.text();
  if (xml.length > MAX_FEED_BYTES) throw new Error("feed too large");

  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };
  const rawItems = toArray(parsed?.rss?.channel?.item).slice(0, MAX_ITEMS_PER_FEED);
  if (rawItems.length === 0) throw new Error("no items parsed");

  const items: RobotaxiNewsItem[] = [];
  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const row = raw as Record<string, unknown>;

    const title = cleanTitle(row.title);
    if (!title) continue;
    const tags = classify(title);
    if (tags.length === 0) continue;

    const link = cleanLink(row.link);
    if (!link) continue;
    const publishedAt = cleanDate(row.pubDate);
    if (!publishedAt) continue;

    items.push({
      id: link,
      title,
      link,
      publishedAt,
      sourceId: source.id,
      sourceLabel: source.label,
      tags,
    });
  }
  return items;
}

// Cross-published stories reach us with different URLs, so titles are
// normalised as a second dedupe key.
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchAllFeeds(previous: PerSourceCache): Promise<RobotaxiNewsData> {
  const settled = await Promise.allSettled(NEWS_SOURCES.map((source) => fetchFeed(source)));

  const sources: NewsSourceStatus[] = [];
  const perSource: PerSourceCache = {};
  const collected: RobotaxiNewsItem[] = [];

  settled.forEach((result, i) => {
    const source = NEWS_SOURCES[i];
    if (result.status === "fulfilled") {
      perSource[source.id] = { items: result.value, at: Date.now() };
      collected.push(...result.value);
      sources.push({
        sourceId: source.id,
        sourceLabel: source.label,
        homepage: source.homepage,
        ok: true,
        itemsMatched: result.value.length,
      });
      return;
    }

    // One dead feed must degrade to a status row, never blank the module —
    // fall back to that source's last good items while the others refresh.
    const stale = previous[source.id]?.items ?? [];
    perSource[source.id] = previous[source.id];
    collected.push(...stale);
    sources.push({
      sourceId: source.id,
      sourceLabel: source.label,
      homepage: source.homepage,
      ok: false,
      itemsMatched: stale.length,
      // Our own string. Never the remote body.
      error: result.reason instanceof Error ? result.reason.message.slice(0, 80) : "fetch failed",
    });
  });

  if (collected.length === 0) {
    throw new Error("every news source failed with no cached fallback");
  }

  const byLink = new Map<string, RobotaxiNewsItem>();
  const seenTitles = new Set<string>();
  for (const item of collected.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))) {
    const key = titleKey(item.title);
    if (byLink.has(item.id) || seenTitles.has(key)) continue;
    byLink.set(item.id, item);
    seenTitles.add(key);
  }

  const items = [...byLink.values()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_ITEMS);

  lastPerSource = perSource;
  return { items, sources, fetchedAt: new Date().toISOString() };
}

// --- Disk-backed guard -----------------------------------------------------
// Same structure and reasoning as lib/data/nhtsaRobotaxi.ts and
// lib/data/celestrak.ts: survive dev restarts, cap retry frequency
// independent of process state, and fail open to the last good snapshot
// rather than rendering a blank panel.
//
// In production Vercel's filesystem is ephemeral, so this is best-effort —
// freshness is effectively per-warm-instance and every cold start refetches.
// That is acceptable at three feeds every 30 minutes. Do NOT "fix" it with a
// KV store or a database; see the no-database rule in CLAUDE.md.
const DISK_CACHE_FILE = path.join(process.cwd(), ".cache", "robotaxi-news.v1.json");

type PerSourceCache = Partial<Record<NewsSourceId, { items: RobotaxiNewsItem[]; at: number } | undefined>>;

interface DiskCacheEntry {
  data?: RobotaxiNewsData;
  perSource?: PerSourceCache;
  lastAttemptAt: number;
  lastSuccessAt?: number;
}

let lastPerSource: PerSourceCache = {};

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

async function fetchNewsDiskGuarded(): Promise<RobotaxiNewsData> {
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
    const fresh = await fetchAllFeeds(cached?.perSource ?? {});
    await writeDiskCache({
      data: fresh,
      perSource: lastPerSource,
      lastAttemptAt: now,
      lastSuccessAt: now,
    });
    return fresh;
  } catch (err) {
    await writeDiskCache({
      data: cached?.data,
      perSource: cached?.perSource,
      lastAttemptAt: now,
      lastSuccessAt: cached?.lastSuccessAt,
    });
    if (cached?.data) return cached.data;
    throw err;
  }
}

// --- In-memory request coalescing ------------------------------------------
let inMemoryCache: { promise: Promise<RobotaxiNewsData>; expiresAt: number } | null = null;

function fetchNewsGuarded(): Promise<RobotaxiNewsData> {
  const now = Date.now();
  if (inMemoryCache && now < inMemoryCache.expiresAt) return inMemoryCache.promise;

  const promise = fetchNewsDiskGuarded();
  inMemoryCache = { promise, expiresAt: now + REVALIDATE_SECONDS * 1000 };
  promise.catch(() => {
    if (inMemoryCache?.promise === promise) inMemoryCache = null;
  });
  return promise;
}

export async function getRobotaxiNews(): Promise<RobotaxiNewsData | null> {
  try {
    return await fetchNewsGuarded();
  } catch {
    return null;
  }
}
