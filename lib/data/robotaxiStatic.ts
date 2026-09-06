import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Manually maintained, cited data on Tesla's Robotaxi program. Same
// discipline as dealsStatic.ts/starmindStatic.ts: every figure below MUST
// carry a real source URL — never estimate, round beyond what the source
// states, or infer a number the source doesn't give. Tesla only discloses
// program-level facts (cumulative miles, FSD version, city launches) on its
// quarterly earnings call — update robotaxiLastUpdated by hand as those land
// or as a city's status changes.
//
// Live/automated data lives separately: NHTSA crash reports in
// lib/data/nhtsaRobotaxi.ts, the news scanner in lib/data/robotaxiNews.ts.
// This file is the static counterpart, same split as celestrak.ts (live) vs
// dealsStatic.ts (static) on the SpaceX side.
//
// Ride counts, fares, per-ride revenue, exact live fleet size, and
// disengagement rate are NOT publicly disclosed by Tesla and have no
// credible third-party measurement — do not add estimated figures for these;
// the UI renders them as an explicit "not disclosed" list instead. Modelled
// figures built on top of them belong in lib/data/robotaxiEconomics.ts, which
// is a separate module precisely so nothing derived can leak in here.

// --- Cities ----------------------------------------------------------------

export interface RobotaxiCityStatus {
  id: string;
  city: string;
  state: string;
  // "driverless"    — public rides with no human in the driver's seat
  // "safety-driver" — public rides with an in-seat human (a regulatory
  //                   requirement in CA, not a Tesla capability statement)
  // "permitted"     — regulator has authorised operation, service not yet
  //                   open to the public at any meaningful scale
  // "announced"     — named by Tesla, no permit or launch confirmed
  status: "driverless" | "safety-driver" | "permitted" | "announced";
  launchDate: CitedFigure<string> | null; // null when no confirmed date
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
    notes:
      "First city to run unsupervised, and the only one carrying Cybercabs — public Cybercab rides opened in a limited Austin geofence on 2026-09-04.",
  },
  {
    id: "dallas",
    city: "Dallas",
    state: "TX",
    status: "driverless",
    launchDate: {
      value: "2026-04",
      source: "https://tech-insider.org/tesla-robotaxi-dallas-houston-unsupervised-launch-2026/",
      sourceLabel: "Tech Insider — Dallas/Houston unsupervised launch",
    },
    notes:
      "Service zone expanded 50% on 2026-08-31 alongside the first Cybercab registrations, running FSD v15 builds.",
  },
  {
    id: "houston",
    city: "Houston",
    state: "TX",
    status: "driverless",
    launchDate: {
      value: "2026-04",
      source: "https://tech-insider.org/tesla-robotaxi-dallas-houston-unsupervised-launch-2026/",
      sourceLabel: "Tech Insider — Dallas/Houston unsupervised launch",
    },
    notes: "Third Texas metro in the unsupervised service area, alongside Austin and Dallas.",
  },
  {
    id: "miami",
    city: "Miami",
    state: "FL",
    status: "driverless",
    launchDate: {
      value: "2026-07-03",
      source: "https://thechargeport.com/robotaxi-tracker",
      sourceLabel: "The Chargeport — robotaxi status tracker",
    },
    notes:
      "First market outside Texas and California, and the first to launch driverless on day one rather than ramping through a safety-driver phase.",
  },
  {
    id: "orlando",
    city: "Orlando",
    state: "FL",
    status: "driverless",
    launchDate: {
      value: "2026-07-21",
      source: "https://thechargeport.com/robotaxi-tracker",
      sourceLabel: "The Chargeport — robotaxi status tracker",
    },
    notes: "Launched driverless on day one, same as Miami and Tampa.",
  },
  {
    id: "tampa",
    city: "Tampa",
    state: "FL",
    status: "driverless",
    launchDate: {
      value: "2026-07-21",
      source: "https://thechargeport.com/robotaxi-tracker",
      sourceLabel: "The Chargeport — robotaxi status tracker",
    },
    notes: "Launched driverless on day one, same as Miami and Orlando.",
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
    notes:
      "Still requires an in-seat human safety driver under California DMV/CPUC autonomous-vehicle rules — a permit constraint, not a capability one.",
  },
  {
    id: "las-vegas",
    city: "Las Vegas",
    state: "NV",
    status: "permitted",
    launchDate: {
      value: "2026-07-27",
      source: "https://thechargeport.com/robotaxi-tracker",
      sourceLabel: "The Chargeport — robotaxi status tracker",
    },
    notes:
      "Nevada granted the AV Network Company permit on 2026-07-27 — but for 10 vehicles against the 5,000 Tesla requested on 2026-06-05, confined to the Strip corridor, capped at 45 mph, with no airport pickups.",
  },
  {
    id: "phoenix",
    city: "Phoenix",
    state: "AZ",
    status: "announced",
    launchDate: null,
    notes:
      "Named in the H1 2026 expansion plan and staging has been observed, but no public launch as of this update — one of two cities Tesla missed its own H1 2026 deadline on.",
  },
];

// --- Fleet -----------------------------------------------------------------
//
// IMPORTANT: two different fleet measures circulate in coverage and they must
// never be plotted on the same series.
//
//   1. TxDMV Automated Motor Vehicle Operator *registrations* — official, and
//      the only figure with a legal reporting obligation behind it (Texas law
//      effective 2026-05-28). Counts vehicles registered in one state, not
//      vehicles actually carrying passengers.
//   2. Crowdsourced observation counts of vehicles seen operating without a
//      safety monitor — useful, directionally real, but unofficial.
//
// A previous version of this file conflated the two: it labelled 45 (the
// Cybercab-only count) as the statewide total, and carried a note claiming
// "42 Model Y grew to 45 with 7 Cybercabs added", which does not add up.
// The two measures are kept in separate exports below for that reason.

export interface FleetObservation {
  date: string;
  modelY: number | null; // null when the source gives only a total
  cybercab: number | null;
  total: CitedFigure<number>;
}

// Official TxDMV registration counts only. Two observations, three months
// apart — do NOT interpolate between them, and do not add a point unless the
// source explicitly attributes it to TxDMV registration data.
export const texasFleetObservations: FleetObservation[] = [
  {
    date: "2026-06-02",
    modelY: 42,
    cybercab: 0,
    total: {
      value: 42,
      source: "https://www.electrive.com/2026/06/02/tesla-robotaxi-fleet-in-texas-reaches-only-42-vehicles/",
      sourceLabel: "electrive — Texas robotaxi fleet reaches 42 vehicles",
      note: "First disclosure under Texas' new AV reporting rules (effective 2026-05-28). All Model Y; roughly 30 of them operating unsupervised in Austin.",
    },
  },
  {
    date: "2026-09-02",
    modelY: 375,
    cybercab: 45,
    total: {
      value: 420,
      source: "https://thechargeport.com/robotaxi-tracker",
      sourceLabel: "The Chargeport — robotaxi status tracker",
      note: "420 Tesla autonomous vehicles registered in Texas: 375 Model Y plus 45 Cybercab. Registrations, not vehicles actively carrying passengers.",
    },
  },
];

export const texasFleetLatest = texasFleetObservations[texasFleetObservations.length - 1];

// Kept as a named export because the fleet total is referenced in several
// places; derived from the series above so it can never drift from the chart.
export const texasFleetCount: CitedFigure<number> = texasFleetLatest.total;

export const cybercabFleetCount: CitedFigure<number> = {
  value: 45,
  source: "https://thechargeport.com/robotaxi-tracker",
  sourceLabel: "The Chargeport — robotaxi status tracker",
  note: "Cybercabs registered in Texas as of 2026-09-02, up from the first 7 registered on 2026-08-31.",
};

// The unofficial counterpart to the registration figures above. Separate
// export, separate label in the UI — this is an observation count, not a
// filing.
export const observedUnsupervisedVehicles: CitedFigure<number> = {
  value: 200,
  source: "https://www.teslarati.com/tesla-surges-robotaxi-fleet-ahead-of-cybercab-launch-event/",
  sourceLabel: "Teslarati — Robotaxi fleet surges ahead of Cybercab event",
  note: "Approximate count of Model Y running without a safety monitor across Austin/Dallas/Houston as of 2026-08-31, per the crowdsourced Robotaxi Tracker — roughly a 7x increase in three weeks. Unofficial: Tesla does not disclose how many vehicles run unsupervised.",
};

// --- Miles -----------------------------------------------------------------

export const cumulativeMiles: CitedFigure<number> = {
  value: 2_400_000,
  source: "https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q2-2026-Update.pdf",
  sourceLabel: "Tesla Q2 2026 shareholder deck",
  note: "Cumulative paid autonomous miles (supervised + unsupervised) as of Q2 2026.",
};

export const cumulativeUnsupervisedMiles: CitedFigure<number> = {
  value: 1_000_000,
  source: "https://electrek.co/2026/09/03/tesla-announces-1-million-unsupervised-miles-driven-by-robotaxi/",
  sourceLabel: "Electrek — Robotaxi passes 1 million unsupervised miles",
  note: "Announced by VP of AI Ashok Elluswamy at the Cybercab launch event on 2026-09-03 — up from the 380,000 reported at Q2 earnings on 2026-07-22, so roughly 620,000 miles added in six weeks.",
};

export interface QuarterlyMiles {
  quarter: string;
  /** Miles added during the quarter. */
  paidMiles: CitedFigure<number>;
  /** Cumulative paid miles at the quarter's close — the figure Tesla actually
   *  reports; the per-quarter value above is the difference between
   *  consecutive closes. */
  cumulative: CitedFigure<number>;
  /** True when the source read the figure off Tesla's chart rather than
   *  quoting a stated number. The UI marks these. */
  approximate?: boolean;
}

// Tesla reports paid robotaxi miles as a CUMULATIVE line in its shareholder
// deck, so the per-quarter values here are differences between consecutive
// disclosed closes — arithmetic over two disclosed figures, which is why they
// render as a normal metric rather than a derived one.
//
// The Q2 2026 decline is real and Tesla-acknowledged. Do not smooth it,
// re-order it, or present it as growth.
//
// Sourcing note: Electrek read ~1.5M off Tesla's Q1 chart, while Drive Tesla
// quoted 1.7M. 1.7M is the figure kept here because it is the one stated in
// prose rather than eyeballed off a plot, and because it reconciles exactly
// with both the 610K Q4 2025 close and the 1.1M / 700K quarterly adds
// reported at Q2 (610K + 1.09M = 1.7M; 1.7M + 0.7M = 2.4M). If a future
// source contradicts that, re-check the whole chain rather than one point.
export const quarterlyPaidMiles: QuarterlyMiles[] = [
  {
    quarter: "Q3 2025",
    approximate: true,
    paidMiles: {
      value: 150_000,
      source: "https://electrek.co/2026/07/22/tesla-robotaxi-growth-flat-own-chart-q2-2026/",
      sourceLabel: "Electrek — Tesla's own chart shows robotaxi growth is flat",
      note: "Read off Tesla's cumulative chart rather than stated in prose. The paid service launched in Austin in June 2025 and Tesla's chart begins around August 2025, so this is a partial quarter.",
    },
    cumulative: {
      value: 150_000,
      source: "https://electrek.co/2026/07/22/tesla-robotaxi-growth-flat-own-chart-q2-2026/",
      sourceLabel: "Electrek — Tesla's own chart shows robotaxi growth is flat",
    },
  },
  {
    quarter: "Q4 2025",
    paidMiles: {
      value: 460_000,
      source: "https://driveteslacanada.ca/news/tesla-robotaxi-usage-surges-in-q1-2026-as-paid-miles-nearly-triple/",
      sourceLabel: "Drive Tesla — paid robotaxi miles nearly triple in Q1 2026",
      note: "Difference between the 610,000-mile Q4 2025 close and the Q3 2025 position.",
    },
    cumulative: {
      value: 610_000,
      source: "https://driveteslacanada.ca/news/tesla-robotaxi-usage-surges-in-q1-2026-as-paid-miles-nearly-triple/",
      sourceLabel: "Drive Tesla — paid robotaxi miles nearly triple in Q1 2026",
      note: "Cumulative paid robotaxi miles at the close of Q4 2025.",
    },
  },
  {
    quarter: "Q1 2026",
    paidMiles: {
      value: 1_090_000,
      source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
      sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
      note: "Tesla's strongest quarter so far — paid miles nearly tripled against Q4 2025.",
    },
    cumulative: {
      value: 1_700_000,
      source: "https://driveteslacanada.ca/news/tesla-robotaxi-usage-surges-in-q1-2026-as-paid-miles-nearly-triple/",
      sourceLabel: "Drive Tesla — paid robotaxi miles nearly triple in Q1 2026",
      note: "Cumulative paid robotaxi miles at the close of Q1 2026.",
    },
  },
  {
    quarter: "Q2 2026",
    paidMiles: {
      value: 700_000,
      source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
      sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
      note: "Down 36% quarter-over-quarter. Tesla attributes the decline to accumulating driving data specific to the Cybercab while being cautious on safety — not to demand.",
    },
    cumulative: {
      value: 2_400_000,
      source: "https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q2-2026-Update.pdf",
      sourceLabel: "Tesla Q2 2026 shareholder deck",
      note: "Cumulative paid robotaxi miles at the close of Q2 2026.",
    },
  },
];

// --- Cybercab --------------------------------------------------------------

export const cybercab = {
  productionStart: {
    value: "Q2 2026",
    source: "https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q2-2026-Update.pdf",
    sourceLabel: "Tesla Q2 2026 shareholder deck",
    note: "Production began at Gigafactory Texas during Q2 2026; engineering test drives on public roads started the same quarter.",
  } as CitedFigure<string>,
  installedAnnualCapacity: {
    value: 125_000,
    source: "https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q2-2026-Update.pdf",
    sourceLabel: "Tesla Q2 2026 shareholder deck",
    note: "Installed annual capacity at Gigafactory Texas — an installed-capacity figure, not a production forecast or a build rate Tesla has hit.",
  } as CitedFigure<number>,
  publicLaunch: {
    value: "2026-09-04",
    source: "https://www.axios.com/2026/09/04/tesla-cybercab-launch-austin",
    sourceLabel: "Axios — Cybercab available for ride-hailing",
    note: "Public rides opened in a limited Austin geofence. Invite-only launch event was 2026-09-03. Cybercabs are mixed into the standard fleet — riders cannot request one specifically.",
  } as CitedFigure<string>,
  configuration: {
    value: "2-seat, no steering wheel or pedals",
    source: "https://www.teslarati.com/tesla-opens-cybercab-rides-to-the-public-with-no-steering-wheel-or-pedals/",
    sourceLabel: "Teslarati — Cybercab opens to the public",
  } as CitedFigure<string>,
};

// --- FSD -------------------------------------------------------------------

export const fsdBuildVersion: CitedFigure<string> = {
  value: "v15",
  source: "https://www.techtimes.com/articles/326094/20260831/tesla-registers-first-cybercabs-texas-expands-dallas-robotaxi-zone-50-percent-fsd-v15-builds.htm",
  sourceLabel: "TechTimes — Dallas robotaxi zone expansion",
  note: "FSD build running the Texas robotaxi fleet as of Aug 2026.",
};

export const fsdSubscriptions: CitedFigure<number> = {
  value: 1_480_000,
  source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
  sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
  note: "Active FSD subscriptions as of Q2 2026, up 56% year-over-year.",
};

export interface QuarterlyFsdSubs {
  quarter: string;
  subs: CitedFigure<number>;
}

// Tesla only began disclosing a subscriber count with Q4 2025 (the first time
// it had ever published one), so this series starts there rather than being
// back-filled. The Q2 2025 point is the comparison base Tesla itself cited for
// its "+56% YoY" claim — a stated figure, not one we computed.
//
// There is no Q3 2025 point: Tesla published none, and interpolating between
// Q2 2025 and Q4 2025 would invent one. The chart leaves the gap visible.
export const quarterlyFsdSubs: QuarterlyFsdSubs[] = [
  {
    quarter: "Q2 2025",
    subs: {
      value: 950_000,
      source: "https://www.notateslaapp.com/news/4483/tesla-fsd-reaches-148-million-active-subscriptions",
      sourceLabel: "Not a Tesla App — FSD reaches 1.48 million active subscriptions",
      note: "The base Tesla cited for its +56% year-over-year figure at Q2 2026.",
    },
  },
  {
    quarter: "Q4 2025",
    subs: {
      value: 1_100_000,
      source: "https://electrek.co/2026/01/28/tesla-discloses-fsd-subscriber-count-first-time-1-million/",
      sourceLabel: "Electrek — Tesla discloses an FSD subscriber count for the first time",
      note: "The first subscriber count Tesla ever published, on the Q4 2025 call.",
    },
  },
  {
    quarter: "Q1 2026",
    subs: {
      value: 1_280_000,
      source: "https://www.basenor.com/blogs/news/tesla-fsd-hits-1-28m-subscribers-in-q1-2026-record-growth",
      sourceLabel: "Basenor — FSD hits 1.28M subscribers in Q1 2026",
      note: "About 180,000 net additions over Q4 2025, a record at the time.",
    },
  },
  {
    quarter: "Q2 2026",
    subs: {
      value: 1_480_000,
      source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
      sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
      note: "Roughly 45% of these are recurring monthly subscribers; the rest bought FSD outright.",
    },
  },
];

export const fsdAttachRate: CitedFigure<number> = {
  value: 55,
  source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
  sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
  note: "Share of new North American deliveries taking FSD in Q2 2026 (Tesla states '>55%').",
};

export const fsdCumulativeMiles: CitedFigure<number> = {
  value: 12_000_000_000,
  source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
  sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
  note: "Cumulative FSD miles driven globally — consumer FSD (Level 2 supervised), a far larger and separate population from the robotaxi fleet's autonomous miles.",
};

// Inputs for the ticking FSD odometer in the UI. Tesla runs a live counter on
// its own FSD page; we cannot read that, so the UI projects forward from the
// last disclosed total at Tesla's own stated rate.
//
// BOTH VALUES BELOW ARE DISCLOSED. The projection built from them is not, and
// the component that renders it says so on screen: it is an extrapolation
// between quarterly disclosures, not a live feed, and it must never be
// presented as a measured figure or written back into this file as one.
export const fsdMilesAnchor = {
  miles: {
    value: 12_000_000_000,
    source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
    sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
    note: "Cumulative FSD miles as of the close of Q2 2026.",
  } as CitedFigure<number>,
  /** The instant the anchor figure describes — Q2 2026 close. */
  asOfIso: "2026-06-30T00:00:00Z",
  milesPerDay: {
    value: 20_400_000,
    source: "https://electrek.co/2026/05/03/tesla-fsd-10-billion-miles-no-magical-milestone-autonomy/",
    sourceLabel: "Electrek — Tesla reaches 10 billion FSD miles",
    note: "Tesla-stated Q1 2026 average of more than 20.4 million FSD miles per day, an all-time high at the time (~13,000 miles per minute). The real rate has almost certainly moved since.",
  } as CitedFigure<number>,
};

// Robotaxi and FSD revenue are not broken out. This is the nearest disclosed
// line item, and the UI must label it as a container, never as robotaxi
// revenue — see notDisclosed below.
export const servicesAndOtherRevenue: CitedFigure<number> = {
  value: 4_580_000_000,
  source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
  sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
  note: "Q2 2026 'Services & Other' revenue, a record and up 50% YoY. Robotaxi fares and FSD subscription revenue land inside this line but are not separated out — it also contains used-vehicle sales, Supercharging, insurance, merchandise and service centres.",
};

export const deferredRevenue: CitedFigure<number> = {
  value: 4_050_000_000,
  source: "https://www.sec.gov/Archives/edgar/data/1318605/000162828026049270/tsla-20260630.htm",
  sourceLabel: "Tesla Q2 2026 Form 10-Q",
  note: "Total deferred revenue as of 2026-06-30. Bundles FSD with internet connectivity, free Supercharging and over-the-air software updates — the FSD portion is not separated out.",
};

// --- AI compute ------------------------------------------------------------

export const trainingCompute = {
  cortex1Mw: {
    value: 90,
    source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
    sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
    note: "Cortex 1 training cluster, in production ('over 90 MW').",
  } as CitedFigure<number>,
  cortex2Mw: {
    value: 115,
    source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
    sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
    note: "Cortex 2 training cluster, in production ('over 115 MW') — more than doubled during H1 2026.",
  } as CitedFigure<number>,
};

// --- Regulatory ------------------------------------------------------------

export interface RegulatoryAction {
  id: string;
  agency: string;
  reference: string;
  title: string;
  status: "open" | "closed";
  opened: string;
  scope: string;
  source: string;
  sourceLabel: string;
}

export const regulatoryActions: RegulatoryAction[] = [
  {
    id: "aq26002",
    agency: "NHTSA ODI",
    reference: "AQ26002",
    title: "Cybercab FMVSS certification audit",
    status: "open",
    opened: "2026-09-04",
    scope:
      "Open Audit Query into how Tesla certified a vehicle with no steering wheel or pedals for public roads. Opened hours after the first public Cybercab rides began in Austin.",
    source: "https://techcrunch.com/2026/09/04/feds-launch-investigation-into-teslas-cybercab-deployment/",
    sourceLabel: "TechCrunch — Feds investigate Cybercab deployment",
  },
  {
    id: "fsd-ea",
    agency: "NHTSA ODI",
    reference: "Engineering Analysis",
    title: "FSD visibility-related collisions",
    status: "open",
    opened: "2026-03-20",
    scope:
      "Escalated from a preliminary evaluation. Covers roughly 3.2 million vehicles after collisions where FSD was engaged within 30 seconds of impact, including a pedestrian fatality. Concerns consumer FSD (Level 2), not the robotaxi ADS fleet.",
    source: "https://cleantechnica.com/2026/03/20/nhtsa-elevates-tesla-fsd-probe-to-engineering-analysis/",
    sourceLabel: "CleanTechnica — NHTSA elevates FSD probe",
  },
  {
    id: "nv-permit",
    agency: "Nevada DMV",
    reference: "AV Network Company permit",
    title: "Las Vegas deployment capped at 10 vehicles",
    status: "open",
    opened: "2026-07-27",
    scope:
      "Tesla requested 5,000 vehicles on 2026-06-05 and was granted 10, restricted to the Las Vegas Strip corridor with a 45 mph ceiling and no airport pickups.",
    source: "https://thechargeport.com/robotaxi-tracker",
    sourceLabel: "The Chargeport — robotaxi status tracker",
  },
];

// --- Gaps ------------------------------------------------------------------

// Metrics Tesla does not publicly disclose and no credible third party
// measures — rendered as an explicit gap in the UI rather than guessed.
export const notDisclosed = [
  "Ride counts and ride volume",
  "Robotaxi revenue (folded into 'Services & Other' with no breakout)",
  "FSD revenue, ARPU and churn (also inside 'Services & Other')",
  "Exact live fleet size — TxDMV registrations are the closest official proxy, and count registrations rather than vehicles in service",
  "Supervised vs unsupervised split of the operating fleet",
  "Disengagement rate for the robotaxi fleet specifically",
  "Wait times and utilisation",
  "Incidents per mile — NHTSA's ADS reports cover all Tesla autonomous operation while Tesla's mileage figures cover paid miles only, so the two cannot be divided into a rate",
];

export const robotaxiLastUpdated = "2026-09-06";
