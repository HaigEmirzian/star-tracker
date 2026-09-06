"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { quarterlyPaidMiles } from "@/lib/data/robotaxiStatic";
import { compact, num, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

// Paid robotaxi miles: bars for miles added each quarter, a line for the
// running total Tesla actually reports.
//
// Both series share ONE y-axis. They are the same unit, so a second scale
// would be the classic dual-axis distortion — the cumulative line genuinely
// sits above the quarterly bars and should look like it does.
//
// The Q2 2026 drop is real and Tesla-acknowledged. Do not smooth it.
const QUARTERLY = "#3987e5";
const CUMULATIVE = "#d95926";

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const added = payload.find((p) => p.dataKey === "added")?.value;
  const total = payload.find((p) => p.dataKey === "cumulative")?.value;
  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <div className="mb-1 text-white/50">{label}</div>
      {added !== undefined && (
        <div className="font-mono tabular-nums text-white">
          <span className="text-white/45">added </span>
          {num(added)} mi
        </div>
      )}
      {total !== undefined && (
        <div className="font-mono tabular-nums text-white/70">
          <span className="text-white/45">total </span>
          {num(total)} mi
        </div>
      )}
    </div>
  );
}

export default function RobotaxiMilesChart() {
  const data = quarterlyPaidMiles.map((q) => ({
    quarter: q.quarter.replace(" 20", " '"),
    added: q.paidMiles.value,
    cumulative: q.cumulative.value,
    approximate: q.approximate ?? false,
  }));

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const changePct = Math.round(((last.added - prev.added) / prev.added) * 100);
  const anyApprox = data.some((d) => d.approximate);

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <SectionLabel
        right={
          <span className={changePct < 0 ? "text-red-300/80" : "text-emerald-300/80"}>
            {changePct > 0 ? "+" : ""}
            {changePct}% QoQ
          </span>
        }
      >
        Paid robotaxi miles
      </SectionLabel>

      {/* min-w-0 — Recharts' measured SVG is otherwise an unshrinkable floor. */}
      <div className="h-[170px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="0" />
            <XAxis
              dataKey="quarter"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v: number) => compact(v)}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar
              dataKey="added"
              fill={QUARTERLY}
              radius={[3, 3, 0, 0]}
              maxBarSize={42}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={CUMULATIVE}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CUMULATIVE, stroke: "#08090c", strokeWidth: 1.5 }}
              activeDot={{ r: 4, fill: CUMULATIVE, stroke: "#08090c", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: QUARTERLY }} />
          Added in quarter
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-sm" style={{ background: CUMULATIVE }} />
          Cumulative
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-white/25">
        Tesla reports the cumulative line; per-quarter values are the differences between
        consecutive closes.
        {anyApprox && " Q3 2025 is read off Tesla's chart rather than stated, and is a partial quarter."}
      </p>
    </div>
  );
}
