// Client-safe shapes for the Robotaxi news scanner. Deliberately kept in a
// zero-import module: lib/data/robotaxiNews.ts pulls in `fs`, `path` and
// `fast-xml-parser`, so a component that accidentally value-imports from it
// (rather than `import type`) would drag Node built-ins into the client
// bundle and break the webpack production build.

export type NewsSourceId = "electrek" | "teslarati" | "techcrunch";

export type NewsTag = "robotaxi" | "cybercab" | "fsd" | "regulatory";

export interface RobotaxiNewsItem {
  id: string; // canonical link — doubles as the React key and the dedupe key
  title: string; // decoded, tag-stripped, whitespace-collapsed, length-capped
  link: string; // validated absolute https: URL
  publishedAt: string; // ISO 8601
  sourceId: NewsSourceId;
  sourceLabel: string; // OURS, from NEWS_SOURCES — never the feed's own <title>
  tags: NewsTag[];
}

export interface NewsSourceStatus {
  sourceId: NewsSourceId;
  sourceLabel: string;
  homepage: string;
  ok: boolean;
  itemsMatched: number;
  error?: string; // our own short string, never a remote response body
}

export interface RobotaxiNewsData {
  items: RobotaxiNewsItem[]; // deduped, newest first, capped
  sources: NewsSourceStatus[]; // always every configured source
  fetchedAt: string;
}
