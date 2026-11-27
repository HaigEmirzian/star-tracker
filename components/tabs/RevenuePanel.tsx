"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dealsRollup } from "@/lib/data/dealsStatic";
import { buildRevenueTimeline, leaseDeals, type RevenueMonth } from "@/lib/data/revenue";

const timeline = buildRevenueTimeline();
const companyColors: Record<string, string> = {
  anthropic: "#D97757",
  google: "#4285F4",
  "reflection-ai": "#F8F6F2",
};
const companyColor = (id: string) => companyColors[id] ?? "#A78BFA";
const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 3,
}).format(value);
const monthLabel = (month: string) => new Date(month + "-01T00:00:00Z").toLocaleDateString("en-US", {
  month: "long", year: "numeric", timeZone: "UTC",
});

function visibleTotal(month: RevenueMonth, deals: typeof leaseDeals) {
  return deals.reduce((sum, deal) => sum + (month.fees[deal.id] ?? 0), 0);
}

function RevenueTooltip({ month, active, multiplier, visibleDeals }: {
  month?: RevenueMonth;
  active?: boolean;
  multiplier: number;
  visibleDeals: typeof leaseDeals;
}) {
  if (!active || !month) return null;

  return (
    <div className="min-w-52 rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 text-left shadow-2xl">
      <div className="text-xs text-white/55">{monthLabel(month.month)}</div>
      <div className="mb-4 mt-1 text-2xl font-semibold tracking-tight text-white">{money(visibleTotal(month, visibleDeals) * multiplier)}</div>
      <div className="space-y-2.5 text-xs">
        {visibleDeals.map((deal) => {
          const fee = month.fees[deal.id];
          return (
            <div key={deal.id} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-white/70">
                <span className="size-2 rounded-full" style={{ backgroundColor: companyColor(deal.id) }} />
                {deal.counterparty}
              </span>
              <span className="font-medium tabular-nums text-white">{fee === null ? "Undisclosed" : money(fee * multiplier)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RevenuePanel() {
  const [annualized, setAnnualized] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const multiplier = annualized ? 12 : 1;
  const visibleDeals = leaseDeals.filter((deal) => !hidden.includes(deal.id));
  const peakRevenue = Math.max(0, ...timeline.map((month) => visibleTotal(month, visibleDeals)));

  function toggleDeal(id: string) {
    setHidden((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">Revenue</h1>
        <p className="mt-3 text-base text-white/55 sm:text-lg">SpaceX compute lease revenue over time.</p>
      </header>

      <div className="min-w-0 rounded-[28px] bg-[#141416] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-sm font-medium text-white/55">Peak scheduled lease revenue</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">{money(peakRevenue * multiplier)}</span>
              <span className="text-sm text-white/45">/ {annualized ? "year" : "month"}</span>
            </div>
          </div>
          <div role="group" aria-label="Revenue period" className="inline-flex rounded-full bg-white/7 p-1 text-sm">
            {[{ label: "Monthly", value: false }, { label: "Annualized", value: true }].map((option) => (
              <button key={option.label} type="button" aria-pressed={annualized === option.value} onClick={() => setAnnualized(option.value)} className={"rounded-full px-4 py-2 font-medium transition-colors " + (annualized === option.value ? "bg-white text-black" : "text-white/60 hover:text-white")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {leaseDeals.map((deal) => (
            <button type="button" key={deal.id} aria-pressed={!hidden.includes(deal.id)} onClick={() => toggleDeal(deal.id)} className={"flex items-center gap-2 transition-opacity " + (hidden.includes(deal.id) ? "opacity-35" : "opacity-100")}>
              <span className="size-2.5 rounded-full" style={{ backgroundColor: companyColor(deal.id) }} />
              <span className="text-white/80">{deal.counterparty}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 h-[330px] w-full sm:h-[390px]" onKeyDown={(event) => event.stopPropagation()}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <defs>
                {leaseDeals.map((deal) => (
                  <linearGradient key={deal.id} id={"revenue-fill-" + deal.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={companyColor(deal.id)} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={companyColor(deal.id)} stopOpacity={0.65} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="#ffffff0d" />
              <XAxis dataKey="month" ticks={["2026-01", "2027-01", "2028-01", "2029-01"]} tickFormatter={(month: string) => month.slice(0, 4)} tick={{ fill: "#ffffff66", fontSize: 12 }} tickMargin={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, "auto"]} tickCount={5} tickFormatter={money} tick={{ fill: "#ffffff66", fontSize: 12 }} tickMargin={8} tickLine={false} axisLine={false} width={54} />
              <Tooltip cursor={{ stroke: "#ffffff35", strokeWidth: 1 }} content={({ active, label }) => <RevenueTooltip active={active} month={timeline.find((row) => row.month === label)} multiplier={multiplier} visibleDeals={visibleDeals} />} />
              {visibleDeals.map((deal) => (
                <Area key={deal.id} name={deal.counterparty} dataKey={(row: RevenueMonth) => (row.fees[deal.id] ?? 0) * multiplier} type="stepAfter" stackId="leases" stroke="none" fill={"url(#revenue-fill-" + deal.id + ")"} fillOpacity={1} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/40">Scheduled fees through 2029, assuming delivery and continuation. Undisclosed ramp fees and Anthropic&apos;s 2029 expiry schedule are excluded.</p>
      </div>

      <p className="text-center text-sm text-white/45">SpaceX reported <span className="font-medium text-white/75">{money(dealsRollup.q3_2026Revenue.value)}</span> in total Q3 2026 revenue.</p>
    </section>
  );
}
