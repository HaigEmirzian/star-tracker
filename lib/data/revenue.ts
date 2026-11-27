import { computeDeals } from "./dealsStatic";

const earningsCall = "https://docs.publicnow.com/viewDoc?filename=28442%5CEXT%5CD2382E66D06B2CAD0252E23426FEE3F569C3482C_7A6291CA6B33DCE0B66186B170E415BE35AF695C.PDF";

export const revenueTargets = {
  december2026: 100_000_000_000,
  december2027Base: 500_000_000_000,
  december2027Upside: 1_000_000_000_000,
  source: earningsCall,
  followUpSource: "https://singjupost.com/full-transcript-ron-baron-interviews-elon-musk-at-baron-investment-conference-2026/",
};

export const leaseDeals = computeDeals.filter((deal) => deal.dealType === "compute lease" && deal.monthlyFee);

export interface RevenueMonth {
  month: string;
  fees: Record<string, number | null>;
  base: number | null;
  upside: number | null;
}

// All values are monthly USD. Null fees indicate undisclosed terms, while
// zero indicates a month outside the known agreement period.
export function buildRevenueTimeline(): RevenueMonth[] {
  return Array.from({ length: 48 }, (_, index) => {
    const year = 2026 + Math.floor(index / 12);
    const month = `${year}-${String(index % 12 + 1).padStart(2, "0")}`;
    const fees: RevenueMonth["fees"] = {};

    for (const deal of leaseDeals) {
      if (month < (deal.rampStartDate ?? deal.startDate.slice(0, 7))) {
        fees[deal.id] = 0;
      } else if (month < (deal.fullRateStartDate ?? deal.startDate.slice(0, 7))) {
        fees[deal.id] = null;
      } else if (deal.expansion && month >= deal.expansion.expectedFullRateStart) {
        fees[deal.id] = year <= deal.expansion.lastFullCalendarYear ? deal.expansion.monthlyFee.value : null;
      } else if (deal.endDate && month > deal.endDate.slice(0, 7)) {
        fees[deal.id] = 0;
      } else {
        fees[deal.id] = deal.monthlyFee!.value;
      }
    }

    // Interpolate only between the two disclosed December run-rate targets.
    const progress = (index - 11) / 12;
    const forecast = (target: number) => progress >= 0 && progress <= 1
      ? (revenueTargets.december2026 + (target - revenueTargets.december2026) * progress) / 12
      : null;

    return { month, fees, base: forecast(revenueTargets.december2027Base), upside: forecast(revenueTargets.december2027Upside) };
  });
}

export function totalKnownFees(month: RevenueMonth) {
  return Object.values(month.fees).reduce<number>((total, fee) => total + (fee ?? 0), 0);
}
