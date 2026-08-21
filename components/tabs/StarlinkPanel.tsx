import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fccStarlinkAuthorization, starlinkNetwork, firstLaunchDate } from "@/lib/data/fccStatic";
import type { StarlinkSummary, StarlinkGpEntry } from "@/lib/data/celestrak";
import type { LaunchSummary } from "@/lib/data/launchLibrary";
import StarlinkGrowthChart from "@/components/tabs/StarlinkGrowthChart";

// globe.gl/three touch window/document and are a heavy dependency (~600KB) —
// load only client-side, only once this panel actually renders.
const StarlinkGlobe = dynamic(() => import("@/components/tabs/StarlinkGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40">
      Loading live constellation view…
    </div>
  ),
});

export interface StarlinkPanelProps {
  summary: StarlinkSummary | null;
  entries: StarlinkGpEntry[];
  upcomingLaunches: LaunchSummary[];
  recentLaunches: LaunchSummary[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-4xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-1 text-sm text-white/40">{sub}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  // UTC explicitly: a date-only string like "2019-05-23" parses as UTC
  // midnight, which a negative-offset local timezone would otherwise
  // display as the day before.
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Unlike formatDate above, this formats a full timestamp (e.g. fetchedAt) —
// it must render in the viewer's local timezone, not UTC, or "Live ·
// updated" can show tomorrow's date while the viewer's clock still reads
// today (UTC runs ahead of US timezones).
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCountdown(netIso: string, nowMs: number): string {
  const diffMs = new Date(netIso).getTime() - nowMs;
  if (diffMs <= 0) return "In progress";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${hours}h ${minutes}m`;
}

// Any Date.now()-derived display must be computed client-side after mount:
// this component renders during SSR/ISR too, and baking "now" into that
// render would either mismatch the client's hydration time (React warning)
// or go stale for up to the ISR revalidate window. This is the standard
// "defer a client-only value past hydration" exception to the no-setState-
// in-effect rule (not a cascading-render risk — it fires once on mount).
// useSyncExternalStore isn't a safe alternative here: StarlinkPanel actually
// unmounts/remounts on every tab switch, so a module-level cached snapshot
// would freeze "now" at first-ever mount instead of refreshing per visit.
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);
  return now;
}

function LaunchListItem({ launch }: { launch: LaunchSummary }) {
  return (
    <li className="text-sm">
      <div className="text-white">
        {launch.satelliteCountIsEstimate ? "~" : ""}
        {launch.satelliteCount} satellites
        {launch.satelliteCountIsEstimate && (
          <span className="ml-1 text-xs text-white/30">(estimated)</span>
        )}
      </div>
      <div className="text-white/40">
        {formatDate(launch.net)} · {launch.statusName}
      </div>
    </li>
  );
}

export default function StarlinkPanel({
  summary,
  entries,
  upcomingLaunches,
  recentLaunches,
}: StarlinkPanelProps) {
  const totalAuthorized = fccStarlinkAuthorization.generations.reduce(
    (sum, g) => sum + g.authorized,
    0,
  );

  const upcomingSatelliteTotal = upcomingLaunches.reduce(
    (sum, l) => sum + l.satelliteCount,
    0,
  );
  const anyUpcomingEstimated = upcomingLaunches.some((l) => l.satelliteCountIsEstimate);

  const now = useNow();
  const daysTracking =
    now !== null
      ? Math.floor((now - new Date(firstLaunchDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {entries.length > 0 ? (
        <StarlinkGlobe entries={entries} />
      ) : (
        <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center text-sm text-white/40">
          Live constellation view unavailable — CelesTrak updates roughly
          every 2 hours. This will populate once a fetch succeeds.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active satellites"
          value={summary ? summary.totalActive.toLocaleString() : "—"}
          sub={
            summary
              ? now !== null
                ? `Live · updated ${formatDateTime(summary.fetchedAt)}`
                : "Live"
              : "Live data warming up"
          }
        />
        <StatCard
          label="Deploying in upcoming launches"
          value={
            upcomingLaunches.length > 0 ? upcomingSatelliteTotal.toLocaleString() : "—"
          }
          sub={
            upcomingLaunches.length > 0
              ? `Next ${upcomingLaunches.length} launches${anyUpcomingEstimated ? " (some estimated)" : ""}`
              : "No data available"
          }
        />
        <StatCard
          label="Next launch"
          value={
            upcomingLaunches.length > 0 && now !== null
              ? formatCountdown(upcomingLaunches[0].net, now)
              : "—"
          }
          sub={upcomingLaunches.length > 0 ? upcomingLaunches[0].statusName : "No data available"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Network capacity"
          value={`${starlinkNetwork.cumulativeCapacityTbps} Tbps`}
          sub={`As of ${starlinkNetwork.lastUpdated}, per SpaceX`}
        />
        <StatCard
          label="Orbits completed / day"
          value={summary ? Math.round(summary.orbitsPerDay).toLocaleString() : "—"}
          sub="Combined across the fleet"
        />
        <StatCard
          label="Days tracking Starlink"
          value={daysTracking !== null ? daysTracking.toLocaleString() : "—"}
          sub={`Since first launch, ${formatDate(firstLaunchDate)}`}
        />
      </div>

      {summary ? (
        summary.cumulativeByLaunchYear.length > 1 && (
          <StarlinkGrowthChart data={summary.cumulativeByLaunchYear} />
        )
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/40 backdrop-blur-sm">
          Live satellite data is temporarily unavailable — CelesTrak updates
          roughly every 2 hours. This chart will populate once a fetch succeeds.
        </div>
      )}

      {summary && summary.shells.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 text-sm uppercase tracking-wide text-white/50">
            Orbital shell distribution
          </div>
          <div className="flex flex-col gap-2">
            {summary.shells.map((shell) => {
              const pct = (shell.count / summary.totalActive) * 100;
              return (
                <div key={shell.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm text-white/60">{shell.label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-14 shrink-0 text-right text-sm text-white/60">
                    {shell.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 text-sm uppercase tracking-wide text-white/50">
            Upcoming launches
          </div>
          <ul className="flex flex-col gap-3">
            {upcomingLaunches.length === 0 && (
              <li className="text-sm text-white/40">No data available</li>
            )}
            {upcomingLaunches.map((l) => (
              <LaunchListItem key={l.id} launch={l} />
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 text-sm uppercase tracking-wide text-white/50">
            Recent launches
          </div>
          <ul className="flex flex-col gap-3">
            {recentLaunches.length === 0 && (
              <li className="text-sm text-white/40">No data available</li>
            )}
            {recentLaunches.map((l) => (
              <LaunchListItem key={l.id} launch={l} />
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Authorized (all generations)"
          value={totalAuthorized.toLocaleString()}
          sub={`As of ${fccStarlinkAuthorization.lastUpdated}`}
        />
        <StatCard
          label="Gen3 requested"
          value={fccStarlinkAuthorization.generations
            .find((g) => g.label === "Gen3")!
            .requested!.toLocaleString()}
          sub="Pending FCC review"
        />
      </div>
    </div>
  );
}
