import { computeDeals, dealsRollup, dealsLastUpdated, type ComputeDeal } from "@/lib/data/dealsStatic";
import { disclosedLeaseValue } from "@/lib/data/revenue";
import RevenuePanel from "@/components/tabs/RevenuePanel";
import ComputeGrowthChart from "@/components/tabs/ComputeGrowthChart";

const usdCompact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);

const numberFmt = (v: number) => v.toLocaleString();

function RollupStat({ label, value, format, caption }: { label: string; value: number; format: (v: number) => string; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{format(value)}</div>
      <div className="mt-1 text-xs text-white/40">{caption}</div>
    </div>
  );
}

function formatRange(startDate: string, endDate: string | null) {
  return endDate ? `${startDate} - ${endDate}` : `${startDate} - ongoing`;
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
            <dt className="text-white/40">{deal.expansion ? "Monthly fee at full capacity" : "Monthly fee"}</dt>
            <dd className="text-right text-white">{deal.expansion ? "~" : ""}{usdCompact((deal.expansion?.monthlyFee ?? deal.monthlyFee).value)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{isAcquisition ? "Implied equity value" : "Total contract value"}</dt>
          <dd className="text-right text-white">{isAcquisition ? "" : deal.id === "google" ? "~" : "Up to "}{usdCompact((deal.expansion?.maximumContractValue ?? deal.totalContractValue).value)}</dd>
        </div>
        {deal.gpuCount && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">{deal.expansion ? "Original agreement GPUs" : "Contracted GPUs"}</dt>
            <dd className="text-right text-white">~{numberFmt(deal.gpuCount.value)}</dd>
          </div>
        )}
        {deal.capacityMw && !deal.expansion && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">Power capacity</dt>
            <dd className="text-right text-white">{deal.capacityMw.value} MW</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{isAcquisition ? "Acquired" : "Term"}</dt>
          <dd className="text-right text-white">{isAcquisition ? deal.startDate : deal.expansion ? `${deal.startDate} - into 2029` : formatRange(deal.startDate, deal.endDate)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-white/50">{deal.notes}</p>
    </div>
  );
}

export default function DealsPanel() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        Compute Deals
      </h1>
      <p className="max-w-xl text-balance text-lg text-white/60">
        SpaceX rents out AI compute capacity at its Colossus data center campus in
        Memphis - here&apos;s who&apos;s renting it, and what it&apos;s worth.
      </p>

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <RevenuePanel />
        <ComputeGrowthChart />
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <RollupStat label="Disclosed lease value" value={disclosedLeaseValue} format={(v) => `~${usdCompact(v)}`} caption="Potential cumulative lease revenue through 2029." />
        <RollupStat label="Colossus GPUs" value={dealsRollup.colossusGpuCount.value} format={numberFmt} caption="Colossus 1 and 2 as of Sep 25, 2026." />
        <RollupStat label="Planned Colossus power capacity" value={dealsRollup.colossusCapacityGw.value} format={(v) => `${v} GW`} caption="Memphis campus target." />
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-4 text-left">
        <div className="text-sm uppercase tracking-wide text-white/50">Deals</div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {computeDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>

      </div>

      <p className="text-xs text-white/30">
        SpaceX Q3 2026 total revenue {usdCompact(dealsRollup.q3_2026Revenue.value)} &middot; Data
        last updated {dealsLastUpdated}
      </p>
    </div>
  );
}
