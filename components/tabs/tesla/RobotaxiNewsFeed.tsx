"use client";

import { useMemo, useState } from "react";
import type { NewsSourceId, NewsTag, RobotaxiNewsData } from "@/lib/data/robotaxiNewsTypes";
import { useNow } from "@/lib/hooks/useNow";
import { stampUtc } from "@/components/tabs/tesla/robotaxiUi";

// Terminal-style news panel: one bordered rectangle, newest at top, history
// scrolling below. Fixed height so the dashboard grid never reflows as items
// come and go.
//
// Every string rendered here came off a third-party RSS feed. It reaches this
// component already tag-stripped, length-capped and https-validated by
// lib/data/robotaxiNews.ts, and React escapes it on the way out — there is no
// dangerouslySetInnerHTML in this file and there must never be one.

const TAG_STYLE: Record<NewsTag, string> = {
  regulatory: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  cybercab: "border-sky-300/25 bg-sky-300/10 text-sky-200",
  robotaxi: "border-white/15 bg-white/5 text-white/45",
  fsd: "border-white/15 bg-white/5 text-white/45",
};

// Most specific tag wins the single slot the row has room for.
const TAG_PRIORITY: NewsTag[] = ["regulatory", "cybercab", "fsd", "robotaxi"];

function primaryTag(tags: NewsTag[]): NewsTag | null {
  for (const tag of TAG_PRIORITY) if (tags.includes(tag)) return tag;
  return tags[0] ?? null;
}

// Borderless: this renders inside a RobotaxiSection, which already supplies
// the card chrome and the "News" heading. Height stays fixed so the dashboard
// grid doesn't reflow as items come and go.
function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex h-[24rem] flex-col overflow-hidden rounded-md border border-white/10 bg-black/20">
      <div className="flex shrink-0 items-center justify-end gap-3 border-b border-white/10 px-3 py-1.5">
        {right}
      </div>
      {children}
    </div>
  );
}

export default function RobotaxiNewsFeed({ news }: { news: RobotaxiNewsData | null }) {
  const [filter, setFilter] = useState<NewsSourceId | "all">("all");
  // Only the header clock needs wall-clock time; row stamps are absolute UTC
  // so they render identically on the server and the client.
  const now = useNow(60_000);

  const items = useMemo(
    () => (news?.items ?? []).filter((i) => filter === "all" || i.sourceId === filter),
    [news, filter],
  );

  if (!news || news.items.length === 0) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-white/30">
          Feed unavailable — no cached items to fall back on.
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <div className="flex items-center gap-1">
          {(["all", ...news.sources.map((s) => s.sourceId)] as const).map((id) => {
            const label = id === "all" ? "All" : news.sources.find((s) => s.sourceId === id)?.sourceLabel;
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id as NewsSourceId | "all")}
                aria-pressed={active}
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/35 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
        {items.map((item) => {
          const tag = primaryTag(item.tags);
          return (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={item.title}
              className="grid grid-cols-[6.5rem_5.5rem_1fr_auto] items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="font-mono text-[10px] tabular-nums text-white/30">
                {stampUtc(item.publishedAt)}
              </span>
              <span className="truncate text-[10px] uppercase tracking-wider text-white/40">
                {item.sourceLabel}
              </span>
              <span className="truncate text-xs text-white/80">{item.title}</span>
              {tag && (
                <span
                  className={`hidden shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider sm:inline ${TAG_STYLE[tag]}`}
                >
                  {tag}
                </span>
              )}
            </a>
          );
        })}
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-white/30">No items from this source.</div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-3 py-1.5 text-[10px] text-white/30">
        <div className="flex flex-wrap items-center gap-3">
          {news.sources.map((s) => (
            <a
              key={s.sourceId}
              href={s.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white/60"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${s.ok ? "bg-emerald-400/70" : "bg-amber-400/70"}`}
                aria-hidden
              />
              {s.sourceLabel}
              <span className="tabular-nums text-white/20">{s.itemsMatched}</span>
              {!s.ok && <span className="text-amber-200/60">stale</span>}
            </a>
          ))}
        </div>
        <span className="font-mono tabular-nums">
          {/* Guarded on `now` so the server HTML and first client render match. */}
          {now === null ? " " : `fetched ${stampUtc(news.fetchedAt)} UTC`}
        </span>
      </div>
    </Shell>
  );
}
