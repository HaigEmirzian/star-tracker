import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Manually maintained, cited data on Tesla's Robotaxi program. Same
// discipline as dealsStatic.ts/starmindStatic.ts: every figure below MUST
// carry a real source URL — never estimate, round beyond what the source
// states, or infer a number the source doesn't give. Tesla only discloses
// program-level facts (cumulative miles, FSD version, city launches) on its
// quarterly earnings call — update robotaxiLastUpdated by hand as those land
// or as a city's status changes.
//
// Live/automated data (NHTSA crash reports) lives separately in
// lib/data/nhtsaRobotaxi.ts — this file is the static counterpart, same split
// as celestrak.ts (live) vs dealsStatic.ts (static) on the SpaceX side.
//
// Ride counts, fares, per-ride revenue, exact live fleet size, and
// disengagement rate are NOT publicly disclosed by Tesla and have no
// credible third-party measurement — do not add estimated figures for these;
// the UI renders them as an explicit "not disclosed" list instead.

export interface RobotaxiCityStatus {
  id: string;
  city: string;
  state: string;
  status: "driverless" | "safety-driver" | "announced";
  launchDate: CitedFigure<string> | null; // null when still "announced" with no confirmed date
  vehicleCount?: CitedFigure<number>; // only when officially/DMV-sourced
  notes: string;
}

export const robotaxiCities: RobotaxiCityStatus[] = [
  {
    id: "austin",
    city: "Austin",
    state: "TX",
    status: "driverless",
    launchDate: {
      value: "2025-06-22",
      source: "https://www.cnbc.com/2026/05/28/tesla-robotaxi-fleet-texas-one-tenth-size-of-waymos-filings-reveal.html",
      sourceLabel: "CNBC — Tesla Robotaxi Texas fleet filings",
    },
    notes: "Fully driverless (no safety driver) since launch. First city to run unsupervised.",
  },
  {
    id: "bay-area",
    city: "San Francisco Bay Area",
    state: "CA",
    status: "safety-driver",
    launchDate: {
      value: "2025-07",
      source: "https://robotaxi-safety-tracker.com/expansion.html",
      sourceLabel: "Robotaxi Safety Tracker — expansion timeline",
    },
    notes: "Requires an in-seat human safety driver, per California DMV/CPUC autonomous-vehicle rules.",
  },
  {
    id: "dallas",
    city: "Dallas",
    state: "TX",
    status: "driverless",
    launchDate: {
      value: "2026-08-31",
      source: "https://www.techtimes.com/articles/326094/20260831/tesla-registers-first-cybercabs-texas-expands-dallas-robotaxi-zone-50-percent-fsd-v15-builds.htm",
      sourceLabel: "TechTimes — Dallas robotaxi zone expansion",
    },
    notes: "Service zone expanded 50% alongside first Cybercab registrations, running on FSD v15 builds.",
  },
  {
    id: "houston",
    city: "Houston",
    state: "TX",
    status: "driverless",
    launchDate: {
      value: "2026",
      source: "https://tech-insider.org/tesla-robotaxi-dallas-houston-unsupervised-launch-2026/",
      sourceLabel: "Tech Insider — Tesla Robotaxi Dallas Houston unsupervised launch",
    },
    notes: "Third Texas metro added to the unsupervised service area, alongside Dallas.",
  },
  {
    id: "phoenix",
    city: "Phoenix",
    state: "AZ",
    status: "announced",
    launchDate: null,
    notes: "Named as part of Tesla's H1 2026 expansion plan.",
  },
  {
    id: "miami",
    city: "Miami",
    state: "FL",
    status: "announced",
    launchDate: null,
    notes: "Named as part of Tesla's H1 2026 expansion plan.",
  },
  {
    id: "orlando",
    city: "Orlando",
    state: "FL",
    status: "announced",
    launchDate: null,
    notes: "Named as part of Tesla's H1 2026 expansion plan.",
  },
  {
    id: "tampa",
    city: "Tampa",
    state: "FL",
    status: "announced",
    launchDate: null,
    notes: "Named as part of Tesla's H1 2026 expansion plan.",
  },
  {
    id: "las-vegas",
    city: "Las Vegas",
    state: "NV",
    status: "announced",
    launchDate: null,
    notes: "Named as part of Tesla's H1 2026 expansion plan, citing tourism demand.",
  },
];

export interface NotableSighting {
  id: string;
  city: string;
  vehicleType: "Model Y" | "Cybercab";
  date: string;
  source: string;
  sourceLabel: string;
  description: string;
}

// Small hand-curated highlight list, NOT a comprehensive registry — real
// per-vehicle fleet tracking (e.g. individual license plates) would require
// a database and a live scraping pipeline this project deliberately doesn't
// run (see the no-database rule in CLAUDE.md). Each entry needs a real,
// citable source.
export const notableSightings: NotableSighting[] = [
  {
    id: "first-cybercab-tx",
    city: "Austin, TX",
    vehicleType: "Cybercab",
    date: "2026-08-31",
    source: "https://www.techtimes.com/articles/326094/20260831/tesla-registers-first-cybercabs-texas-expands-dallas-robotaxi-zone-50-percent-fsd-v15-builds.htm",
    sourceLabel: "TechTimes — first Cybercabs registered in Texas",
    description: "First 7 Cybercabs registered with the Texas DMV under Tesla Robotaxi, LLC, alongside the existing Model Y fleet.",
  },
];

export const texasFleetCount: CitedFigure<number> = {
  value: 45,
  source: "https://www.techtimes.com/articles/326103/20260831/dallas-robotaxi-zone-grows-50-percent-tesla-registers-first-45-cybercabs-texas.htm",
  sourceLabel: "TechTimes — Tesla registers first Cybercabs in Texas",
  note: "Statewide TxDMV Automated Motor Vehicle Operator registration count across all TX cities combined (Austin/Dallas/Houston). 42 Model Y as of 2026-05-28 (CNBC), grew to 45 with 7 Cybercabs added by 2026-08-31.",
};

export const cumulativeMiles: CitedFigure<number> = {
  value: 2_400_000,
  source: "https://ir.tesla.com",
  sourceLabel: "Tesla Q2 2026 shareholder deck",
  note: "Cumulative paid autonomous (supervised + unsupervised) miles as of Q2 2026, +41% quarter-over-quarter",
};

export const cumulativeUnsupervisedMiles: CitedFigure<number> = {
  value: 380_000,
  source: "https://ir.tesla.com",
  sourceLabel: "Tesla Q2 2026 shareholder deck",
  note: "Cumulative fully unsupervised (no safety driver) miles across 6 cities, with zero notable incidents per Tesla's own reporting",
};

export const fsdBuildVersion: CitedFigure<string> = {
  value: "v15",
  source: "https://www.techtimes.com/articles/326094/20260831/tesla-registers-first-cybercabs-texas-expands-dallas-robotaxi-zone-50-percent-fsd-v15-builds.htm",
  sourceLabel: "TechTimes — Dallas robotaxi zone expansion",
  note: "FSD build running the Dallas/Texas robotaxi fleet as of Aug 2026",
};

// Metrics Tesla does not publicly disclose and no credible third party
// measures — rendered as an explicit gap in the UI rather than guessed.
export const notDisclosed = [
  "Ride counts and ride volume",
  "Per-ride fares and revenue",
  "Exact live fleet size (Texas DMV registration counts are the closest official proxy)",
  "Disengagement rate for the robotaxi fleet specifically",
  "Wait times",
];

export const robotaxiLastUpdated = "2026-09-02";
