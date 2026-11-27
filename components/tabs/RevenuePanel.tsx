"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dealsRollup } from "@/lib/data/dealsStatic";
import { buildRevenueTimeline, leaseDeals, totalKnownFees, type RevenueMonth } from "@/lib/data/revenue";

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
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
  month: "short", year: "numeric", timeZone: "UTC",
});

function RevenueTooltip({ month, active, multiplier, hidden }: {
  month?: RevenueMonth;
  active?: boolean;
  multiplier: number;
  hidden: string[];
}) {
  if (!active || !month) return null;
  const total = totalKnownFees(month);
  return (
    <div className="min-w-56 rounded-xl border border-white/15 bg-black/95 p-4 text-left text-xs shadow-xl">
      <div className="mb-3 text-sm font-semibold text-white">{monthLabel(month.month)}</div>
      <div className="space-y-2">
        {leaseDeals.map((deal) => (
          <div key={deal.id} className={`flex items-center justify-between gap-5 ${hidden.includes(deal.id) ? "opacity-40" : ""}`}>
            <span className="flex items-center gap-2 text-white/70"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: companyColor(deal.id) }} />{deal.counterparty}</span>
            <span className="text-white">{month.fees[deal.id] === null ? "Undisclosed" : money(month.fees[deal.id]! * multiplier)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-5 border-t border-white/15 pt-2 font-semibold text-white"><span>All known leases</span><span>{money(total * multiplier)}</span></div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-white/50">{caption}</div>
    </div>
  );
}

export default function RevenuePanel() {
  const [annualized, setAnnualized] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const multiplier = annualized ? 12 : 1;
  const toggleDeal = (id: string) => setHidden((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">Revenue</h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-lg text-white/60">SpaceX compute lease revenue over time.</p>
      </header>

      <div className="mx-auto w-full max-w-sm">
        <SummaryCard label="Q3 2026 revenue" value={money(dealsRollup.q3_2026Revenue.value)} caption="Reported quarterly revenue" />
      </div>

      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Revenue timeline</h2>
            <p className="mt-1 text-xs text-white/50">{annualized ? "Annualized monthly run rate (USD)" : "Monthly revenue (USD)"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Revenue period" className="inline-flex rounded-full border border-white/15 p-1 text-xs">
              {[{ label: "Monthly", value: false }, { label: "Annualized", value: true }].map((option) => (
                <button key={option.label} type="button" aria-pressed={annualized === option.value} onClick={() => setAnnualized(option.value)} className={`rounded-full px-3 py-1.5 ${annualized === option.value ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>{option.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full sm:h-[510px]" onKeyDown={(event) => event.stopPropagation()}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeline} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.09)" />
              <XAxis dataKey="month" ticks={["2026-01", "2027-01", "2028-01", "2029-01", "2029-12"]} tickFormatter={monthLabel} tick={{ fill: "#ffffff80", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, "auto"]} tickFormatter={money} tick={{ fill: "#ffffff80", fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip cursor={{ stroke: "#ffffff40" }} content={({ active, label }) => <RevenueTooltip active={active} month={timeline.find((row) => row.month === label)} multiplier={multiplier} hidden={hidden} />} />
              {leaseDeals.map((deal) => (
                <Area key={deal.id} name={deal.counterparty} dataKey={(row: RevenueMonth) => (row.fees[deal.id] ?? 0) * multiplier} type="stepAfter" stackId="leases" hide={hidden.includes(deal.id)} stroke={companyColor(deal.id)} fill={companyColor(deal.id)} fillOpacity={0.85} strokeWidth={1.5} isAnimationActive={false} />
              ))}

            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          {leaseDeals.map((deal) => (
            <button type="button" key={deal.id} aria-pressed={!hidden.includes(deal.id)} onClick={() => toggleDeal(deal.id)} className={`flex items-center gap-2 ${hidden.includes(deal.id) ? "text-white/30 line-through" : "text-white/80"}`}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: companyColor(deal.id) }} />{deal.counterparty}
            </button>
          ))}

        </div>
      </div>

      <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-white/45">
        Lease areas use disclosed scheduled fees, assuming contracts continue and capacity is delivered. Undisclosed ramp fees and Anthropic&apos;s unknown 2029 expiry schedule are omitted. ARR equals monthly revenue x 12.
      </p>
    </section>
  );
}
