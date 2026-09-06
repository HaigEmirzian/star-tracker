"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { quarterlyPaidMiles } from "@/lib/data/robotaxiStatic";
import { compact, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

// Categorical slot 1 (blue), validated against this panel's #08090c backdrop
// via the dataviz skill's palette validator — same hue the Starlink chart uses.
// A single series needs no legend; the section title names it. Note the Q2
// decline is real and Tesla-acknowledged: do not recolor it as an alert, and
// do not smooth it.
const SERIES = "#3987e5";

export default function RobotaxiMilesChart() {
  const data = quarterlyPaidMiles.map((q) => ({
    quarter: q.quarter,
    miles: q.paidMiles.value,
  }));

  if (data.length < 2) return null;

  const first = data[0].miles;
  const last = data[data.length - 1].miles;
  const changePct = Math.round(((last - first) / first) * 100);

  // min-w-0 on both the card and the plot box below: as a flex/grid child each
  // defaults to min-width:auto, and Recharts' measured SVG then acts as an
  // unshrinkable content floor that pushes the page wide on narrow screens.
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <SectionLabel right={`${changePct > 0 ? "+" : ""}${changePct}% QoQ`}>
        Paid robotaxi miles per quarter
      </SectionLabel>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
            <XAxis
              dataKey="quarter"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => compact(v)}
            />
            {/* Two bars with direct labels — a tooltip would hide the values
                behind a hover the reader has no reason to try. */}
            <Bar dataKey="miles" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={64}>
              {data.map((d) => (
                <Cell key={d.quarter} fill={SERIES} />
              ))}
              <LabelList
                dataKey="miles"
                position="top"
                offset={6}
                fill="rgba(255,255,255,0.75)"
                fontSize={11}
                formatter={(v) => (typeof v === "number" ? compact(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-white/35">
        {quarterlyPaidMiles[quarterlyPaidMiles.length - 1].paidMiles.note}
      </p>
    </div>
  );
}
