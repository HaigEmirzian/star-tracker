"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TxdmvFleetData } from "@/lib/data/txdmvFleetTypes";
import { texasFleetObservations } from "@/lib/data/robotaxiStatic";
import { num } from "@/components/tabs/tesla/robotaxiUi";

// Texas registered-fleet growth, from the live TxDMV series when it is
// available and the two hand-cited observations when it is not.
//
// Only official registration counts belong on this series. The crowdsourced
// "vehicles seen running unsupervised" tally is a different measure and is
// rendered as its own metric — never as a point here.
const SERIES = "#3987e5";

function formatDate(label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${label}T00:00:00Z`));
}

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
        {num(payload[0].value ?? 0)} registered
      </div>
    </div>
  );
}

export default function RobotaxiFleetChart({ fleet }: { fleet: TxdmvFleetData | null }) {
  const live = fleet?.history ?? [];
  const isLive = live.length >= 2;

  const data = isLive
    ? live.map((p) => ({ label: p.label, count: p.count }))
    : texasFleetObservations.map((o) => ({ label: formatDate(o.date), count: o.total.value }));

  if (data.length < 2) return null;

  const last = data[data.length - 1];

  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white/80">Texas registered fleet</h3>
      <div className="mb-4 mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
        {num(last.count)}
      </div>

      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="rtFleetFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.3} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              interval="preserveStartEnd"
              minTickGap={24}
              height={48}
              label={{ value: "Date", position: "insideBottom", fill: "rgba(255,255,255,0.6)", fontSize: 13 }}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={64}
              allowDecimals={false}
              label={{ value: "Vehicles", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.6)", fontSize: 13 }}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={SERIES}
              strokeWidth={2}
              fill="url(#rtFleetFill)"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3.5, fill: SERIES, stroke: "#08090c", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
