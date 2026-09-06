import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Shared citation machinery. This is the enforcement mechanism for the rule
// that runs through every data file in this repo (see CLAUDE.md): a figure
// never appears in the UI without the source it came from. It lived as a
// private helper inside DealsPanel until a second panel needed it — a second,
// subtly-different copy is exactly how that rule erodes, so it lives here now.

export interface Footnote {
  label: string;
  source: string;
}

// Dedupes by source URL, so one article cited by six figures renders once.
export function collectFootnotes(figures: CitedFigure<unknown>[]): Footnote[] {
  const seen = new Map<string, Footnote>();
  for (const fig of figures) {
    seen.set(fig.source, { label: fig.sourceLabel, source: fig.source });
  }
  return Array.from(seen.values());
}

// --- Derived figures -------------------------------------------------------
// A `CitedFigure` is something a source actually stated. A `DerivedFigure` is
// something WE computed, and the two must never be rendered in the same visual
// register — see components/tabs/tesla/RobotaxiRevenueModel.tsx.
//
// The dividing line:
//   - Arithmetic over two DISCLOSED figures is a normal metric (e.g.
//     unsupervised share = 1.0M / 2.4M, both cited, both footnoted).
//   - Arithmetic needing ANY non-disclosed input is derived, must be labelled
//     as such, and may only appear inside the derived module.
export interface DerivedFigure {
  value: number;
  // Human-readable arithmetic, rendered under the value so the reader can
  // check the math rather than take it on trust: "700,000 mi x $1.54/mi".
  formula: string;
  // The cited inputs the formula consumed, so they still reach the footnotes.
  inputs: CitedFigure<unknown>[];
  // What the number is NOT — take rate, deadhead miles, promo pricing, etc.
  caveats: string[];
}
