// Inputs for the Robotaxi revenue model.
//
// READ THIS BEFORE ADDING ANYTHING HERE.
//
// Tesla discloses NO robotaxi revenue, NO FSD revenue, NO ARPU and NO churn.
// All of it sits inside the "Services & Other" line with no breakout. Nothing
// in this file is a revenue disclosure — these are model *inputs*, and the
// output built from them is an estimate that must never be rendered in the
// same visual register as a disclosed figure, never written back into
// robotaxiStatic.ts, and never labelled "revenue" without the word "modelled".
//
// Every input carries a `kind` that says how much weight it can bear:
//
//   disclosed  — Tesla stated it. Cited, and locked in the UI.
//   reported   — a named publication reported it. Cited, adjustable, and the
//                UI shows a badge when the reader moves it off the cited value.
//   assumption — nobody has published it. Labelled as the reader's own
//                assumption, and defaulted conservatively.
//
// If you cannot put a real URL on a `disclosed` or `reported` input, it is an
// `assumption`. There is no fourth option.

export type InputKind = "disclosed" | "reported" | "assumption";

export interface ModelInput {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  kind: InputKind;
  source?: string; // required unless kind === "assumption"
  sourceLabel?: string;
  note?: string;
}

export const revenueInputs: ModelInput[] = [
  {
    id: "paidMiles",
    label: "Paid robotaxi miles",
    value: 700_000,
    unit: "mi",
    min: 100_000,
    max: 3_000_000,
    step: 50_000,
    kind: "disclosed",
    source: "https://evwire.com/p/tesla-q2-2026-earnings-results",
    sourceLabel: "EVWire — Tesla Q2 2026 earnings recap",
    note: "Q2 2026, as reported by Tesla. Q1 2026 was 1.1M.",
  },
  {
    id: "avgTripMiles",
    label: "Average trip length",
    value: 6,
    unit: "mi",
    min: 2,
    max: 15,
    step: 0.5,
    kind: "reported",
    source: "https://www.basenor.com/blogs/news/tesla-robotaxi-pricing-just-changed-base-fee-triples-to-3",
    sourceLabel: "Basenor — Robotaxi pricing change",
    note: "The reference trip in fare coverage: a six-mile ride quoted at $11.40 under the $3.00 + $1.40/mi structure, which is exactly 3.00 + 6 x 1.40. Tesla does not publish an average trip length.",
  },
  {
    id: "baseFare",
    label: "Base fare",
    value: 3.25,
    unit: "$",
    min: 0,
    max: 10,
    step: 0.25,
    kind: "reported",
    source: "https://www.basenor.com/blogs/news/tesla-robotaxi-pricing-just-changed-base-fee-triples-to-3",
    sourceLabel: "Basenor — Robotaxi pricing change",
    note: "Austin, latest reported. Was $3.00 in March 2026. Fares vary by city and change without announcement.",
  },
  {
    id: "perMileFare",
    label: "Per-mile fare",
    value: 1.0,
    unit: "$/mi",
    min: 0.25,
    max: 4,
    step: 0.05,
    kind: "reported",
    source: "https://www.basenor.com/blogs/news/tesla-robotaxi-pricing-just-changed-base-fee-triples-to-3",
    sourceLabel: "Basenor — Robotaxi pricing change",
    note: "Austin, latest reported. Was $1.40/mi in March 2026 — Tesla cut the per-mile rate while raising the base fare.",
  },
  {
    id: "costPerMile",
    label: "Operating cost per mile",
    value: 0.66,
    unit: "$/mi",
    min: 0.2,
    max: 2.5,
    step: 0.02,
    kind: "reported",
    source: "https://longyield.substack.com/p/tesla-how-many-robotaxis-are-already",
    sourceLabel: "Longyield — Tesla robotaxi cost stack",
    note: "Third-party cost stack, not a Tesla figure, and it applies to TOTAL miles driven rather than paid miles. Tesla has never published a robotaxi cost per mile.",
  },
  {
    id: "deadheadShare",
    label: "Unpaid (deadhead) miles",
    value: 30,
    unit: "%",
    min: 0,
    max: 70,
    step: 5,
    kind: "assumption",
    note: "Miles driven between rides, repositioning or charging, with no passenger aboard. Nobody publishes this for Tesla. It only affects the cost side — fares are charged on paid miles — so total miles are modelled as paid ÷ (1 − this).",
  },
];

// Rendered alongside the model output. These are the reasons the number is a
// floor/sketch rather than an estimate of Tesla's actual robotaxi P&L.
export const modelCaveats = [
  "Gross passenger fares only — this is not revenue Tesla books, and not profit.",
  "No promotional pricing, discounts, referral credits or free rides, all of which Tesla has used during launches.",
  "One fare structure applied to every city. Austin's is the only one reported in a base + per-mile form; Bay Area fares ran materially higher ($8.31–$14.59 daily average per ride).",
  "No surge, wait-time or cancellation charges.",
  "Trip count is derived by dividing paid miles by an average trip length — Tesla publishes neither ride counts nor trip lengths.",
  "The cost figure is a third-party stack applied to modelled total miles; it excludes vehicle depreciation, insurance, remote-operator staffing, depot and charging capex.",
];

export const economicsLastUpdated = "2026-09-06";
