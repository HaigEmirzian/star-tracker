"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { quarterlyFsdSubs } from "@/lib/data/robotaxiStatic";
import { compact, num } from "@/components/tabs/tesla/robotaxiUi";

// FSD active subscriptions by quarter. Every point is a figure Tesla or its
// coverage stated — nothing here is interpolated, which is why the series
// jumps straight from Q2 2025 to Q4 2025: Tesla published no Q3 2025 count,
// and inventing one to make the spacing even would be exactly the kind of
// smoothing the rest of this panel refuses to do.
const SERIES = "#3987e5";

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      <div className="text-white/50">{label}</div>
      <div className="font-mono font-semibold tabular-nums text-white">
        {num(payload[0].value ?? 0)} subscriptions
      </div>
    </div>
  );
}

export default function RobotaxiFsdChart() {
  const data = quarterlyFsdSubs.map((q) => ({
    quarter: q.quarter.replace(" 20", " '"),
    subs: q.subs.value,
  }));

  if (data.length < 2) return null;

  const last = data[data.length - 1].subs;

  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white/80">FSD subscriptions</h3>
      <div className="mb-4 mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
        {compact(last)}
      </div>

      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="rtFsdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.3} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
            <Area
              type="monotone"
              dataKey="subs"
              stroke={SERIES}
              strokeWidth={2}
              fill="url(#rtFsdFill)"
              dot={{ r: 2.5, fill: SERIES, stroke: "#08090c", strokeWidth: 1.5 }}
              activeDot={{ r: 4, fill: SERIES, stroke: "#08090c", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
