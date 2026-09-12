"use client";

import {
  Bar,
  CartesianGrid,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { quarterlyPaidMiles } from "@/lib/data/robotaxiStatic";
import { compact, num } from "@/components/tabs/tesla/robotaxiUi";

// Paid robotaxi miles: bars for miles added each quarter.
//
// The Q2 2026 drop is real and Tesla-acknowledged. Do not smooth it.
const QUARTERLY = "#3987e5";

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
  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      <div className="mb-1 text-white/50">{label}</div>
      {added !== undefined && (
        <div className="font-mono tabular-nums text-white">
          <span className="text-white/45">added </span>
          {num(added)} mi
        </div>
      )}
    </div>
  );
}

export default function RobotaxiMilesChart() {
  const data = quarterlyPaidMiles.map((q) => ({
    quarter: q.quarter.replace(" 20", " '"),
    added: q.paidMiles.value,
  }));

  if (data.length < 2) return null;

  const last = data[data.length - 1];

  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white/80">Paid robotaxi miles</h3>
      <div className="mb-4 mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
        {compact(last.added)} mi
      </div>

      {/* min-w-0 — Recharts' measured SVG is otherwise an unshrinkable floor. */}
      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="0" />
            <XAxis
              dataKey="quarter"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={46}
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
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
