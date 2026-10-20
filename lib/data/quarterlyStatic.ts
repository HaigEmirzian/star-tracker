import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Manually transcribed from SpaceX's Q3 2026 results supplied on Oct 20.
// Link to the official financials index: a public direct PDF URL has not
// been verified. These dated company disclosures never replace live feeds.
export const q3ResultsSource = {
  source: "https://ir.spacex.com/financials/",
  sourceLabel: "SpaceX — Q3 2026 results (released October 20, 2026)",
};

function reported(value: number, note: string): CitedFigure<number> {
  return { value, ...q3ResultsSource, note };
}

export const q3Results = {
  lastUpdated: "2026-10-20",
  periodEnd: "2026-09-30",
  company: {
    revenue: reported(14_575_000_000, "Q3 consolidated revenue; up 161% year over year. Results p. 3."),
    netIncome: reported(4_404_000_000, "Q3 consolidated GAAP net income. Results p. 9."),
    capex: reported(19_593_000_000, "Q3 consolidated capital expenditures. Results p. 3."),
  },
  connectivity: {
    subscribers: reported(13_600_000, "Consumer subscribers at September 30; includes personal and business subscription plans, excludes managed enterprise and government contracts. Results pp. 5, 8."),
    arpu: reported(69, "Monthly consumer ARPU for Q3, not a plan price. Results p. 5."),
    equippedAircraft: reported(3_800, "Over 3,800 aircraft equipped at September 30. Results p. 5."),
    countries: reported(174, "Countries with Starlink coverage at September 30. Results p. 2."),
    revenue: reported(5_248_000_000, "Q3 Connectivity segment revenue, including consumer, enterprise and government. Results p. 5."),
    operatingIncome: reported(2_367_000_000, "Q3 Connectivity segment GAAP operating income. Results p. 5."),
    satellitesInOrbit: reported(11_100, "Rounded 11.1K at September 30. Includes operational and de-orbit approved satellites; the former definition would exclude approximately 400. Results pp. 2, 8."),
    v3SatellitesOnFlight14: reported(26, "SpaceX reports Flight 14 delivered 26 V3 satellites, approximately 10x the downlink capacity added by a Falcon 9 Starlink launch. Results p. 4."),
  },
  si: {
    nameplateComputeGw: reported(1.7, "SI nameplate compute at September 30, up from 1.4 GW at June 30; not an orbital compute or GPU-count disclosure. Results p. 6."),
    revenue: reported(7_560_000_000, "Q3 Super Intelligence segment revenue; includes cloud services, Cursor, Grok and advertising. Results p. 6."),
    operatingIncome: reported(431_000_000, "Q3 SI GAAP operating income, including $1.217B of acquisition-related share-based compensation. Results p. 6."),
    capex: reported(16_444_000_000, "Q3 SI capital expenditures. Results p. 6."),
  },
};
