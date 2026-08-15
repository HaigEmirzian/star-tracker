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

const SERIES_COLOR = "#3987e5"; // sequential blue, step 400 (dark-surface variant)

interface Props {
  data: { year: number; cumulativeActive: number }[];
}

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      <div className="text-white/50">{label}</div>
      <div className="font-semibold text-white">
        {payload[0].value.toLocaleString()} active satellites
      </div>
    </div>
  );
}

export default function StarlinkGrowthChart({ data }: Props) {
  if (data.length < 2) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-1 text-sm uppercase tracking-wide text-white/50">
        Active satellites by launch year
      </div>
      <div className="mb-4 text-xs text-white/30">
        Cumulative count of currently-active satellites, grouped by original
        launch year — derived live from CelesTrak orbital data
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="starlinkGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.28} />
                <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)
              }
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
            <Area
              type="monotone"
              dataKey="cumulativeActive"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              fill="url(#starlinkGrowthFill)"
              dot={false}
              activeDot={{ r: 4, fill: SERIES_COLOR, stroke: "black", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
