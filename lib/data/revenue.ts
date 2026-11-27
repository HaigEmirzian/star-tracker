import { computeDeals } from "./dealsStatic";

export const leaseDeals = computeDeals.filter((deal) => deal.dealType === "compute lease" && deal.monthlyFee);

export const disclosedLeaseValue = leaseDeals.reduce(
  (total, deal) => total + (deal.expansion?.maximumContractValue ?? deal.totalContractValue).value,
  0,
);

export interface RevenueMonth {
  month: string;
  fees: Record<string, number | null>;
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

    return { month, fees };
  });
}

export function totalKnownFees(month: RevenueMonth) {
  return Object.values(month.fees).reduce<number>((total, fee) => total + (fee ?? 0), 0);
}
