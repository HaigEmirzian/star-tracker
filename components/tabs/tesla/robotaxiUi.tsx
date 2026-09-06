import type { ReactNode } from "react";
import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Shared formatting + shell primitives for the Robotaxi dashboard.
//
// These are deliberately Tesla-family-local rather than app-wide: this panel
// runs a denser scale than the SpaceX panels (p-3/text-xl against their
// p-6/text-4xl), and hoisting a single StatTile across both would immediately
// grow variant props and become a worse abstraction than the duplication.
// The one thing that IS shared app-wide is the citation machinery, because
// that enforces a rule rather than a look — see lib/citations.ts.

export const num = (v: number) => v.toLocaleString("en-US");

export const compact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const usd = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);

export const usdExact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

/** Formats an ISO instant as a fixed UTC stamp — "05 SEP 15:06".
 *  Deliberately not locale- or timezone-dependent: this renders during SSR
 *  as well as on the client, and toLocaleString() there is a hydration
 *  mismatch waiting to happen (see lib/hooks/useNow.ts). */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export function stampUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// --- Shell -----------------------------------------------------------------

export function Card({
  children,
  className = "",
  dashed = false,
}: {
  children: ReactNode;
  className?: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border ${
        dashed ? "border-dashed border-amber-300/25 bg-amber-300/[0.03]" : "border-white/10 bg-white/[0.04]"
      } p-3 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">{children}</h2>
      {right && <div className="text-[10px] uppercase tracking-wider text-white/25">{right}</div>}
    </div>
  );
}

/** A disclosed metric. `figure` must be something a source actually stated —
 *  anything computed from a non-disclosed input belongs in the revenue model's
 *  separate visual register instead. */
export function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: "default" | "muted";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
          accent === "muted" ? "text-white/50" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 line-clamp-3 text-[11px] leading-snug text-white/35">{sub}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "info";
}) {
  const tones = {
    neutral: "border-white/20 bg-white/10 text-white/60",
    good: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    warn: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    info: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  } as const;
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Horizontal distribution row — the same pattern StarlinkPanel uses for its
 *  orbital-shell breakdown, at this panel's tighter scale. */
export function BarRow({
  label,
  count,
  max,
  labelWidth = "w-40",
}: {
  label: string;
  count: number;
  max: number;
  labelWidth?: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className={`${labelWidth} shrink-0 truncate text-white/45`} title={label}>
        {label}
      </div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/55" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 shrink-0 text-right font-mono tabular-nums text-white/70">{count}</div>
    </div>
  );
}

export function SourceLink({ figure }: { figure: CitedFigure<unknown> }) {
  return (
    <a
      href={figure.source}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] text-white/30 underline decoration-white/15 underline-offset-2 hover:text-white/60"
    >
      {figure.sourceLabel}
    </a>
  );
}
