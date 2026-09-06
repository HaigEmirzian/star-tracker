"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { texasFleetObservations } from "@/lib/data/robotaxiStatic";
import { num, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

// Categorical slots 1 and 2 (blue, orange) — validated together against this
// panel's #08090c backdrop: CVD ΔE 26.8, normal-vision ΔE 31.8, both well
// clear of the floors. Stacked segments carry a 2px surface gap.
const MODEL_Y = "#3987e5";
const CYBERCAB = "#d95926";
const GAP = "#08090c";

export default function RobotaxiFleetChart() {
  // Only TxDMV registration observations belong on this series. The
  // crowdsourced "vehicles seen running unsupervised" count is a different
  // measure and is rendered as its own metric, never as a point here.
  const data = texasFleetObservations.map((o) => ({
    date: o.date,
    modelY: o.modelY ?? 0,
    cybercab: o.cybercab ?? 0,
    total: o.total.value,
  }));

  if (data.length < 2) return null;

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <SectionLabel right={`${data.length} observations`}>Texas registered fleet (TxDMV)</SectionLabel>
      {/* min-w-0 — see the note in RobotaxiMilesChart.tsx. */}
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Bar
              dataKey="modelY"
              stackId="fleet"
              fill={MODEL_Y}
              stroke={GAP}
              strokeWidth={2}
              isAnimationActive={false}
              maxBarSize={64}
            />
            <Bar
              dataKey="cybercab"
              stackId="fleet"
              fill={CYBERCAB}
              stroke={GAP}
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              maxBarSize={64}
            >
              <LabelList
                dataKey="total"
                position="top"
                offset={6}
                fill="rgba(255,255,255,0.75)"
                fontSize={11}
                formatter={(v) => (typeof v === "number" ? num(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: MODEL_Y }} /> Model Y
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: CYBERCAB }} /> Cybercab
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-white/35">
        Two official observations three months apart, not interpolated. Registrations, not vehicles in
        service — Tesla does not disclose how many are actually carrying passengers.
      </p>
    </div>
  );
}
