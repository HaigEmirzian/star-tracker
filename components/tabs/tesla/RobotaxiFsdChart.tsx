"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { fsdSubscriptions, fsdAttachRate, fsdCumulativeMiles } from "@/lib/data/robotaxiStatic";
import { compact } from "@/components/tabs/tesla/robotaxiUi";

const SERIES = "#3987e5";

// FSD subscription scale. Tesla publishes the current count and a
// year-over-year change but no quarterly series, so this is deliberately TWO
// bars rather than an invented trend line: the prior-year value is implied by
// dividing the disclosed count by the disclosed growth rate — arithmetic over
// two disclosed figures — and is labelled as implied on screen.
export default function RobotaxiFsdChart() {
  const current = fsdSubscriptions.value;
  const growth = 0.56; // Tesla-stated +56% YoY, same source as the count.
  const priorYear = Math.round(current / (1 + growth));

  const data = [
    { period: "Q2 2025", subs: priorYear },
    { period: "Q2 2026", subs: current },
  ];

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          FSD subscriptions
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-emerald-300/80">+56% YoY</span>
      </div>

      <div className="h-[108px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="0" />
            <XAxis
              dataKey="period"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            />
            <YAxis hide />
            <Bar dataKey="subs" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={70}>
              {/* The implied prior-year bar is dimmed so the published figure
                  reads as the solid one; the note below says so in words too. */}
              {data.map((d) => (
                <Cell key={d.period} fill={SERIES} fillOpacity={d.period === "Q2 2025" ? 0.45 : 1} />
              ))}
              <LabelList
                dataKey="subs"
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

      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] tabular-nums text-white/40">
        <span>&gt;{fsdAttachRate.value}% attach</span>
        <span>{compact(fsdCumulativeMiles.value)} cumulative mi</span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-white/25">
        Q2 2025 is implied by the disclosed +56% growth, not separately published. Consumer FSD, a
        far larger population than the robotaxi fleet.
      </p>
    </div>
  );
}
