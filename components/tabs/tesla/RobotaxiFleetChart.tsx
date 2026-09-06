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
    <div className="rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
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
    : texasFleetObservations.map((o) => ({ label: o.date, count: o.total.value }));

  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          TX registered fleet
        </h3>
        {fleet?.tesla ? (
          <span className="font-mono text-[11px] tabular-nums text-emerald-300/80">
            +{fleet.tesla.growth30dPct.toFixed(1)}% / 30d
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-white/25">
            {data.length} observations
          </span>
        )}
      </div>

      {/* min-w-0 — Recharts' measured SVG is otherwise an unshrinkable floor. */}
      <div className="h-[108px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="rtFleetFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.3} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="0" />
            <XAxis dataKey="label" hide />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={34}
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

      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-white/30">
        <span>
          {first.label} · {num(first.count)}
        </span>
        <span>
          {last.label} · {num(last.count)}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-white/25">
        {isLive
          ? "Live from the Texas DMV autonomous-vehicle registry. Registrations, not vehicles in service."
          : "Two cited observations, not interpolated. Registrations, not vehicles in service."}
      </p>
    </div>
  );
}
