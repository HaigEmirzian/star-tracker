import type { CitedFigure } from "@/lib/data/gpuSpecs";
import { collectFootnotes } from "@/lib/citations";
import { computeDeals, dealsRollup, dealsLastUpdated, type ComputeDeal } from "@/lib/data/dealsStatic";
import { q3Results, q3ResultsSource } from "@/lib/data/quarterlyStatic";

const usdCompact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);

const numberFmt = (v: number) => v.toLocaleString();

function RollupStat({ label, figure, format }: { label: string; figure: CitedFigure<number>; format: (v: number) => string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{format(figure.value)}</div>
      {figure.note && <div className="mt-1 text-xs text-white/40">{figure.note}</div>}
    </div>
  );
}

function formatRange(startDate: string, endDate: string | null) {
  return endDate ? `${startDate} – ${endDate}` : `${startDate} – ongoing`;
}

function DealCard({ deal }: { deal: ComputeDeal }) {
  const isAcquisition = deal.dealType === "acquisition";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{deal.counterparty}</div>
          <div className="text-xs uppercase tracking-wide text-white/40">{deal.facility}</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
            isAcquisition
              ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          }`}
        >
          {isAcquisition ? "Acquisition" : "Compute lease"}
        </span>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        {deal.monthlyFee && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">Monthly fee</dt>
            <dd className="text-right text-white">{usdCompact(deal.monthlyFee.value)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{isAcquisition ? "Implied equity value" : "Total contract value"}</dt>
          <dd className="text-right text-white">{usdCompact(deal.totalContractValue.value)}</dd>
        </div>
        {deal.gpuCount && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">GPUs</dt>
            <dd className="text-right text-white">{numberFmt(deal.gpuCount.value)}</dd>
          </div>
        )}
        {deal.capacityMw && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">Power capacity</dt>
            <dd className="text-right text-white">{deal.capacityMw.value} MW</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{isAcquisition ? "Closed" : "Term"}</dt>
          <dd className="text-right text-white">{isAcquisition ? deal.startDate : formatRange(deal.startDate, deal.endDate)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-white/50">{deal.notes}</p>
    </div>
  );
}

export default function DealsPanel() {
  const dealFootnotes = computeDeals.flatMap((deal) =>
    [deal.monthlyFee, deal.totalContractValue, deal.gpuCount, deal.capacityMw].filter(
      (f): f is CitedFigure<number> => f !== undefined,
    ),
  );
  const rollupFootnotes = [...Object.values(dealsRollup), ...Object.values(q3Results.si), ...Object.values(q3Results.company)];

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        Compute Deals
      </h1>
      <p className="max-w-xl text-balance text-lg text-white/60">
        SpaceX rents out AI compute capacity at its Colossus data center campus in
        Memphis — here&apos;s who&apos;s renting it, and what it&apos;s worth.
      </p>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <RollupStat label="Committed lease revenue" figure={dealsRollup.combinedLeaseRevenue} format={usdCompact} />
        <RollupStat label="Colossus GPUs (est.)" figure={dealsRollup.colossusGpuCount} format={numberFmt} />
        <RollupStat label="SI nameplate compute" figure={q3Results.si.nameplateComputeGw} format={(v) => `${v} GW`} />
      </div>

      <section className="flex w-full flex-col gap-4 text-left" aria-labelledby="si-quarter-heading">
        <div>
          <h2 id="si-quarter-heading" className="text-sm uppercase tracking-wide text-white/50">Q3 2026 · Super Intelligence</h2>
          <p className="mt-2 text-sm text-white/50">
            Company-reported results for the quarter ended {q3Results.periodEnd}.
            SI is the segment previously called AI and includes cloud services,
            Cursor, Grok and advertising; its revenue is broader than the leases below.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RollupStat label="SI revenue" figure={q3Results.si.revenue} format={usdCompact} />
          <RollupStat label="SI operating income" figure={q3Results.si.operatingIncome} format={usdCompact} />
          <RollupStat label="SI capex" figure={q3Results.si.capex} format={usdCompact} />
        </div>
        <p className="text-xs text-white/40">
          Company totals: revenue {usdCompact(q3Results.company.revenue.value)}, GAAP net income{" "}
          {usdCompact(q3Results.company.netIncome.value)}, capex {usdCompact(q3Results.company.capex.value)}.
          {" "}<a href={q3ResultsSource.source} target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 hover:text-white/60">SpaceX Q3 results</a>
        </p>
      </section>

      <div className="flex w-full flex-col gap-4 text-left">
        <div className="text-sm uppercase tracking-wide text-white/50">Deals</div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {computeDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>

        <ul className="flex flex-col gap-1 text-xs text-white/30">
          {collectFootnotes([...dealFootnotes, ...rollupFootnotes]).map((fn) => (
            <li key={fn.source}>
              <a
                href={fn.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/20 hover:text-white/50"
              >
                {fn.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-white/30">
        Planned Memphis campus power capacity {dealsRollup.colossusCapacityGw.value} GW · Target{" "}
        {dealsRollup.target2027PowerGw.value} GW of power/cooling online by end of 2027 · Data
        last updated {dealsLastUpdated}
      </p>
    </div>
  );
}
