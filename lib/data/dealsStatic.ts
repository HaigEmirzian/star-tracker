import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Manually maintained, cited data on SpaceX's third-party AI compute
// contracts (Colossus data center leases, plus the Cursor acquisition).
// Same discipline as starmindStatic.ts/fccStatic.ts: every dollar/capacity
// figure below MUST carry a real source URL — never estimate, round beyond
// what the source states, or infer a number the source doesn't give. These
// deals move fast (new ones land every few weeks); update `dealsLastUpdated`
// whenever a figure below changes.

export interface ComputeDeal {
  id: string;
  counterparty: string;
  counterpartyType: "AI lab" | "hyperscaler" | "acquisition";
  dealType: "compute lease" | "acquisition";
  facility: string;
  monthlyFee?: CitedFigure<number>; // USD
  totalContractValue: CitedFigure<number>; // USD
  gpuCount?: CitedFigure<number>;
  capacityMw?: CitedFigure<number>;
  startDate: string;
  endDate: string | null; // null = open-ended / not yet stated
  notes: string;
}

export const computeDeals: ComputeDeal[] = [
  {
    id: "anthropic",
    counterparty: "Anthropic",
    counterpartyType: "AI lab",
    dealType: "compute lease",
    facility: "Colossus 1 (Memphis)",
    monthlyFee: {
      value: 1_250_000_000,
      source: "https://www.axios.com/2026/05/20/anthropic-spacex-compute",
      sourceLabel: "Axios — Anthropic paying SpaceX $15B/year",
    },
    totalContractValue: {
      value: 45_000_000_000,
      source: "https://www.cnbc.com/2026/05/06/anthropic-spacex-data-center-capacity.html",
      sourceLabel: "CNBC — Anthropic/SpaceX compute deal",
      note: "Full contract term through May 2029, at the stated monthly rate",
    },
    gpuCount: {
      value: 220_000,
      source: "https://www.cnbc.com/2026/05/06/anthropic-spacex-data-center-capacity.html",
      sourceLabel: "CNBC — Anthropic/SpaceX compute deal",
      note: "Lease covers all of Colossus 1's capacity — 220,000+ Nvidia GPUs",
    },
    capacityMw: {
      value: 300,
      source: "https://www.cnbc.com/2026/05/06/anthropic-spacex-data-center-capacity.html",
      sourceLabel: "CNBC — Anthropic/SpaceX compute deal",
      note: "300MW+ of new capacity delivered within the announced month",
    },
    startDate: "2026-05",
    endDate: "2029-05",
    notes:
      "Reduced fees during a capacity ramp-up in May/June 2026. Beyond the terrestrial lease, Anthropic and SpaceX are jointly exploring gigawatt-scale orbital AI compute.",
  },
  {
    id: "google",
    counterparty: "Google",
    counterpartyType: "hyperscaler",
    dealType: "compute lease",
    facility: "Colossus 2 (Memphis)",
    monthlyFee: {
      value: 920_000_000,
      source: "https://www.cnbc.com/2026/06/05/google-to-pay-spacex-920-million-a-month-for-xai-compute-capacity.html",
      sourceLabel: "CNBC — Google/SpaceX compute deal",
    },
    totalContractValue: {
      value: 30_000_000_000,
      source: "https://techcrunch.com/2026/06/05/google-will-pay-spacex-920m-per-month-for-compute/",
      sourceLabel: "TechCrunch — Google to pay SpaceX $920M/month",
      note: "Roughly $30B over the contract's lifetime (Oct 2026 through June 2029) at the stated monthly rate",
    },
    gpuCount: {
      value: 110_000,
      source: "https://www.cnbc.com/2026/06/05/google-to-pay-spacex-920-million-a-month-for-xai-compute-capacity.html",
      sourceLabel: "CNBC — Google/SpaceX compute deal",
      note: "110,000 Nvidia GPUs plus supporting CPUs/memory",
    },
    startDate: "2026-10",
    endDate: "2029-06",
    notes:
      "If SpaceX can't hit the 110,000-GPU target (plus a one-month grace period), Google can cancel or settle for fewer GPUs with a pro-rata fee reduction.",
  },
  {
    id: "reflection-ai",
    counterparty: "Reflection AI",
    counterpartyType: "AI lab",
    dealType: "compute lease",
    facility: "Colossus 2 (Memphis)",
    monthlyFee: {
      value: 150_000_000,
      source: "https://www.cnbc.com/2026/06/22/spacex-ai-colossus-data-center-reflection.html",
      sourceLabel: "CNBC — SpaceX/Reflection AI compute deal",
    },
    totalContractValue: {
      value: 6_300_000_000,
      source: "https://mlq.ai/news/spacex-signs-63b-compute-deal-with-reflection-ai-for-colossus-data-center/",
      sourceLabel: "MLQ News — SpaceX $6.3B Reflection AI deal",
      note: "Total if the deal runs through 2029 at the stated monthly rate",
    },
    startDate: "2026-07",
    endDate: "2029-12",
    notes:
      "Uses Nvidia GB300 chips at Colossus 2. Either party can exit with 90 days' notice after an initial 3-month period.",
  },
  {
    id: "cursor",
    counterparty: "Cursor",
    counterpartyType: "acquisition",
    dealType: "acquisition",
    facility: "SpaceX GPU fleet (incl. Colossus)",
    totalContractValue: {
      value: 60_000_000_000,
      source: "https://en.cryptonomist.ch/2026/08/15/spacex-cursor-acquisition/",
      sourceLabel: "Cryptonomist — SpaceX closes $60B Cursor acquisition",
      note: "Acquisition price, not a compute-lease revenue figure",
    },
    startDate: "2026-08-15",
    endDate: null,
    notes:
      "SpaceX bought Cursor outright rather than leasing it capacity — Cursor now gets access to SpaceX's GPU fleet, including Colossus, to scale its own model training.",
  },
];

// Aggregate figures that don't belong to a single deal row.
export const dealsRollup = {
  combinedLeaseRevenue: {
    value: 80_000_000_000,
    source: "https://mlq.ai/news/spacex-signs-63b-compute-deal-with-reflection-ai-for-colossus-data-center/",
    sourceLabel: "MLQ News — SpaceX $6.3B Reflection AI deal",
    note: "Combined committed revenue from outside compute tenants (Anthropic, Google, Reflection, Cursor's prior lease) through 2029 — excludes the Cursor acquisition price itself",
  } as CitedFigure<number>,
  q2_2026Revenue: {
    value: 7_800_000_000,
    source:
      "https://techcrunch.com/2026/08/04/spacex-doubles-revenues-on-anthropic-and-google-compute-deals-starlink-growth/",
    sourceLabel: "TechCrunch — SpaceX doubles revenue on compute deals",
    note: "Total company revenue, up from $4B in Q2 2025",
  } as CitedFigure<number>,
  colossusGpuCount: {
    value: 555_000,
    source: "https://introl.com/blog/xai-colossus-2-gigawatt-expansion-555k-gpus-january-2026",
    sourceLabel: "Introl — xAI Colossus 2GW expansion (estimate)",
    note: "Estimate, not an official disclosure: combined Nvidia GPU count across all three Colossus buildings as reported ~Jan 2026, when xAI (now under SpaceX after its Feb 2026 acquisition) purchased a third building. Confirmed per-building figures tied to specific leases are lower and more solid: 220,000+ at Colossus 1 (Anthropic) and 110,000 at Colossus 2 (Google) — see the deal cards below.",
  } as CitedFigure<number>,
  colossusCapacityGw: {
    value: 2,
    source: "https://www.teslarati.com/spacex-confirms-third-massive-compute-deal-colossus-memphis/",
    sourceLabel: "Teslarati — SpaceX third Colossus compute deal",
    note: "Planned total power capacity across the Memphis campus (Colossus 1, 2, and a third building)",
  } as CitedFigure<number>,
  target2027PowerGw: {
    value: 20,
    source: "https://www.teslarati.com/spacex-confirms-third-massive-compute-deal-colossus-memphis/",
    sourceLabel: "Teslarati — SpaceX third Colossus compute deal",
    note: "Elon Musk's stated target for power/cooling capacity online by end of 2027, per SpaceX's Q2 2026 earnings call",
  } as CitedFigure<number>,
};

export const dealsLastUpdated = "2026-08-20";
