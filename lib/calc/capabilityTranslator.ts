// Pure math for the Capability Translator (Starmind tab). No React/JSX here
// on purpose — keeping the arithmetic isolated from the component makes it
// reviewable (and eventually testable) independent of rendering concerns.
import type { comparisonFactors } from "@/lib/data/comparisonFactors";
import type { GpuSpec } from "@/lib/data/gpuSpecs";

/** Precision buckets the translator supports. */
export type Precision = "fp16" | "fp8" | "fp4";

/**
 * Shape of a GPU's specs as consumed by this calculator. Deliberately does
 * NOT import from `lib/data/gpuSpecs.ts` — that file is being built in
 * parallel on `feature/gpu-spec-comparison` and doesn't exist on this
 * branch. `tdpWatts` and each `flops.*` entry are optional because not
 * every GPU publishes every figure (e.g. FP4 Tensor Core throughput only
 * exists on newer architectures) — callers must never fabricate a 0 for a
 * missing value.
 */
export interface GpuLike {
  id: string;
  name: string;
  tdpWatts?: number;
  /** Peak Tensor Core throughput in raw FLOPS (not TFLOPS) per precision. */
  flops: Partial<Record<Precision, number>>;
}

/**
 * Adapts a `lib/data/gpuSpecs.ts` entry (cited, TFLOPS, GPU-only) into the
 * `GpuLike` shape this calculator uses (uncited plain numbers, raw FLOPS).
 * `gpuSpecs.ts` documents its FLOPS figures in TFLOPS, matching how Nvidia
 * publishes them — this is the one place that ×10^12 conversion happens, so
 * it's never silently duplicated or missed at a call site. A missing
 * citation (Nvidia hasn't published that figure yet) stays missing here too
 * — never coerced to 0.
 */
export function gpuSpecToGpuLike(spec: GpuSpec): GpuLike {
  const flops: Partial<Record<Precision, number>> = {};
  if (spec.flops.fp16 !== undefined) flops.fp16 = spec.flops.fp16.value * 1e12;
  if (spec.flops.fp8 !== undefined) flops.fp8 = spec.flops.fp8.value * 1e12;
  if (spec.flops.fp4 !== undefined) flops.fp4 = spec.flops.fp4.value * 1e12;
  return {
    id: spec.id,
    name: spec.name,
    tdpWatts: spec.tdpWatts?.value,
    flops,
  };
}

export interface ComputeTotalsInput {
  tdpWatts?: number;
  flopsByPrecision: Partial<Record<Precision, number>>;
  quantity: number;
}

export interface ComputeTotalsResult {
  totalPowerW: number | null;
  totalFlopsByPrecision: Partial<Record<Precision, number>>;
}

/** Scales a single GPU's specs linearly by quantity. */
export function computeTotals({
  tdpWatts,
  flopsByPrecision,
  quantity,
}: ComputeTotalsInput): ComputeTotalsResult {
  const totalPowerW = tdpWatts !== undefined ? tdpWatts * quantity : null;
  const totalFlopsByPrecision: Partial<Record<Precision, number>> = {};
  for (const [precision, flops] of Object.entries(flopsByPrecision) as [
    Precision,
    number | undefined,
  ][]) {
    if (flops !== undefined) totalFlopsByPrecision[precision] = flops * quantity;
  }
  return { totalPowerW, totalFlopsByPrecision };
}

/** Auto-scales watts to the largest sensible unit (W / kW / MW / GW). */
export function formatPower(watts: number): string {
  const abs = Math.abs(watts);
  if (abs < 1_000) return `${watts.toLocaleString(undefined, { maximumFractionDigits: 0 })} W`;
  if (abs < 1_000_000)
    return `${(watts / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kW`;
  if (abs < 1_000_000_000)
    return `${(watts / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MW`;
  return `${(watts / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} GW`;
}

/** Auto-scales a raw FLOPS figure to the largest sensible unit. */
export function formatFlops(flops: number): string {
  const units: [number, string][] = [
    [1e18, "EFLOPS"],
    [1e15, "PFLOPS"],
    [1e12, "TFLOPS"],
    [1e9, "GFLOPS"],
  ];
  for (const [threshold, label] of units) {
    if (Math.abs(flops) >= threshold) {
      return `${(flops / threshold).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${label}`;
    }
  }
  return `${flops.toLocaleString(undefined, { maximumFractionDigits: 0 })} FLOPS`;
}

export interface RelatableComparison {
  label: string;
  count: number;
}

/**
 * Pure conversion from a total power draw into relatable everyday units.
 * Returns structured data only — the component decides how to round,
 * pluralize, and format for display.
 *
 * `avgUsHomePowerDrawKw` and the plant-output factors are themselves
 * continuous-power figures, so those two comparisons are a direct power/power
 * ratio (no time assumption needed). The Tesla comparison is inherently
 * energy-based (a full charge is a fixed number of kWh, not a power draw),
 * so it assumes the input power is sustained for 24 hours to get a daily
 * energy figure — that assumption lives here, not silently in the UI.
 */
export function relatableComparisons(
  totalPowerW: number,
  factors: typeof comparisonFactors,
): RelatableComparison[] {
  const totalPowerKw = totalPowerW / 1_000;
  const dailyEnergyKwh = totalPowerKw * 24;

  return [
    {
      label: "US homes (avg. continuous power draw)",
      count: totalPowerKw / factors.avgUsHomePowerDrawKw.value,
    },
    {
      label: "Tesla Model 3 full charges per day",
      count: dailyEnergyKwh / factors.teslaModel3BatteryKwh.value,
    },
    {
      label: "nuclear power plants (avg. output)",
      count: totalPowerW / (factors.nuclearPlantOutputMw.value * 1_000_000),
    },
    {
      label: "wind turbines (avg. nameplate capacity)",
      count: totalPowerW / (factors.windTurbineOutputMw.value * 1_000_000),
    },
  ];
}

/**
 * Compute-side counterpart to relatableComparisons(). Currently a single
 * comparison (PS5 GPU FLOPS) — a direct FLOPS-to-FLOPS comparison, unlike a
 * TOPS-based device spec (integer/quantized ops, a different unit). Still
 * approximate in spirit (dense FP32 GPU shader throughput vs. Tensor Core
 * matrix-multiply FLOPS at a specific precision), so the label says
 * "GPU compute" rather than implying an exact equivalence.
 */
export function computeRelatableComparisons(
  totalFlops: number,
  factors: typeof comparisonFactors,
): RelatableComparison[] {
  return [
    {
      label: "PlayStation 5s' worth of GPU compute",
      count: totalFlops / (factors.ps5GpuTflops.value * 1e12),
    },
  ];
}

// --- Log-scale slider mapping -------------------------------------------
//
// The quantity control spans 1 to 1,000,000 GPUs. A linear slider over that
// range is unusable: with 1,000,000 discrete steps mapped to ~300px of
// track, every pixel of drag jumps the value by ~3,300, so small quantities
// (1-1,000) — the range most people actually want to explore — are
// compressed into a couple of pixels. A log-scale slider fixes this: slider
// *position* (0-1) maps to quantity on a logarithmic curve, so each unit of
// slider movement represents a constant *multiplicative* step rather than a
// constant additive one, giving 1→10, 10→100, 100→1,000, etc. equal screen
// space.
const QUANTITY_MIN = 1;
const QUANTITY_MAX = 1_000_000;
const LOG_MIN = Math.log10(QUANTITY_MIN);
const LOG_MAX = Math.log10(QUANTITY_MAX);

/** Maps a linear slider position (0-100) to a quantity (1 to 1,000,000). */
export function sliderPositionToQuantity(position: number): number {
  const clamped = Math.min(100, Math.max(0, position));
  const log = LOG_MIN + (clamped / 100) * (LOG_MAX - LOG_MIN);
  return Math.round(10 ** log);
}

/** Inverse of `sliderPositionToQuantity`: maps a quantity to slider position (0-100). */
export function quantityToSliderPosition(quantity: number): number {
  const clamped = Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, quantity));
  const log = Math.log10(clamped);
  return ((log - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

export const QUANTITY_BOUNDS = { min: QUANTITY_MIN, max: QUANTITY_MAX };
