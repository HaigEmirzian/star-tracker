"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeGrowth } from "@/lib/data/computeGrowth";

const color = "#9CBBFF";
const chartData = computeGrowth.map((point) => ({ ...point, time: Date.parse(point.date) }));
const latest = chartData[chartData.length - 1];
const dateLabel = (time: number) => new Date(time).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export default function ComputeGrowthChart() {
  return (
    <section className="flex min-w-0 w-full flex-col gap-4 text-left">
      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-medium text-white/50">Reported compute capacity</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight text-white">{latest.gw}</span>
            <span className="text-sm text-white/50">GW</span>
          </div>
        </div>

        <div className="h-[320px] w-full sm:h-[360px]" onKeyDown={(event) => event.stopPropagation()}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.09)" />
              <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} ticks={[chartData[0].time, chartData[1].time, chartData[5].time, latest.time]} tickFormatter={dateLabel} tick={{ fill: "#ffffff80", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, "auto"]} tickFormatter={(value: number) => `${value} GW`} tick={{ fill: "#ffffff80", fontSize: 11 }} tickLine={false} axisLine={false} width={54} />
              <Tooltip cursor={{ stroke: "#ffffff40" }} content={({ active, label }) => {
                const point = chartData.find((row) => row.time === label);
                if (!active || !point) return null;
                return (
                  <div className="rounded-xl border border-white/15 bg-black/95 p-4 text-left text-xs shadow-xl">
                    <div className="mb-2 text-white/60">{dateLabel(point.time)}</div>
                    <div className="font-semibold text-white">{point.gw} GW</div>
                  </div>
                );
              }} />
              <Area dataKey="gw" type="linear" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-white/80">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
          Nameplate compute
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-white/45">Installed compute capacity as reported in SpaceX&apos;s prospectus and quarterly results. Latest: {dateLabel(latest.time)}.</p>
    </section>
  );
}
