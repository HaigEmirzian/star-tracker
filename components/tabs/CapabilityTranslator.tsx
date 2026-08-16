"use client";

import { useId, useState } from "react";
import { comparisonFactors } from "@/lib/data/comparisonFactors";
import {
  computeTotals,
  constellationScale,
  formatFlops,
  formatPower,
  quantityToSliderPosition,
  relatableComparisons,
  sliderPositionToQuantity,
  QUANTITY_BOUNDS,
  type GpuLike,
  type Precision,
} from "@/lib/calc/capabilityTranslator";
import { starmind } from "@/lib/data/starmindStatic";

// ---------------------------------------------------------------------------
// TEMPORARY LOCAL STUB — will be replaced by a real import from
// `lib/data/gpuSpecs.ts` once `feature/gpu-spec-comparison` merges. That
// branch didn't exist in this worktree, so this list exists only so the
// Capability Translator is fully buildable/demoable standalone in the
// meantime. Figures are real, stable, long-published specs (low drift risk)
// — TDP and Tensor Core TFLOPS from each GPU's official NVIDIA datasheet.
// TFLOPS are converted to raw FLOPS (×10^12) to match `GpuLike.flops`.
// A GPU with no published figure for a precision simply omits that key —
// never a fabricated 0.
const GPU_STUB: GpuLike[] = [
  {
    id: "h100-sxm",
    name: "NVIDIA H100 SXM",
    // TDP up to 700W; FP16/FP8 Tensor Core TFLOPS as published on
    // https://www.nvidia.com/en-us/data-center/h100/ (Hopper has no FP4
    // Tensor Core support, so fp4 is omitted).
    tdpWatts: 700,
    flops: {
      fp16: 1979e12,
      fp8: 3958e12,
    },
  },
  {
    id: "h200-sxm",
    name: "NVIDIA H200 SXM",
    // Same Hopper compute die as H100 (700W TDP, identical Tensor Core
    // throughput) with more/faster memory — per
    // https://www.nvidia.com/en-us/data-center/h200/. No FP4 support.
    tdpWatts: 700,
    flops: {
      fp16: 1979e12,
      fp8: 3958e12,
    },
  },
  {
    id: "b200",
    name: "NVIDIA B200 (Blackwell)",
    // 1000W TDP; dense (non-sparse) Tensor Core TFLOPS from NVIDIA's
    // published Blackwell datasheet figures (corroborated across NVIDIA's
    // HGX B200 datasheet and multiple secondary spec aggregators): FP16/BF16
    // 2,250 TFLOPS, FP8 4,500 TFLOPS, FP4 9,000 TFLOPS dense.
    tdpWatts: 1000,
    flops: {
      fp16: 2250e12,
      fp8: 4500e12,
      fp4: 9000e12,
    },
  },
];

const PRECISIONS: { key: Precision; label: string }[] = [
  { key: "fp16", label: "FP16" },
  { key: "fp8", label: "FP8" },
  { key: "fp4", label: "FP4" },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-1 text-sm text-white/40">{sub}</div>}
    </div>
  );
}

function RelatableComparisonList({
  comparisons,
}: {
  comparisons: { label: string; count: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {comparisons.map((c) => (
        <div
          key={c.label}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
        >
          <span className="font-semibold text-white">
            ≈ {c.count.toLocaleString(undefined, { maximumFractionDigits: c.count < 10 ? 2 : 0 })}
          </span>{" "}
          {c.label}
        </div>
      ))}
    </div>
  );
}

export default function CapabilityTranslator() {
  const [selectedGpuId, setSelectedGpuId] = useState(GPU_STUB[0].id);
  const [quantity, setQuantity] = useState(1);
  const [precision, setPrecision] = useState<Precision>("fp16");
  const [constellationMode, setConstellationMode] = useState(false);
  const [gpusPerSatellite, setGpusPerSatellite] = useState(1);

  const sliderId = useId();
  const quantityInputId = useId();
  const gpusPerSatelliteId = useId();

  const gpu = GPU_STUB.find((g) => g.id === selectedGpuId) ?? GPU_STUB[0];
  const availablePrecisions = PRECISIONS.filter((p) => gpu.flops[p.key] !== undefined);
  const activePrecision = gpu.flops[precision] !== undefined ? precision : availablePrecisions[0].key;

  const totals = constellationMode
    ? constellationScale({
        gpusPerSatellite,
        satelliteCount: starmind.fccFiling.requestedSatellites,
        perGpu: { tdpWatts: gpu.tdpWatts, flopsByPrecision: gpu.flops },
      })
    : computeTotals({ tdpWatts: gpu.tdpWatts, flopsByPrecision: gpu.flops, quantity });

  const totalFlops = totals.totalFlopsByPrecision[activePrecision] ?? 0;
  const comparisons =
    totals.totalPowerW !== null ? relatableComparisons(totals.totalPowerW, comparisonFactors) : [];

  function onSliderChange(position: number) {
    setQuantity(sliderPositionToQuantity(position));
  }

  function onQuantityInputChange(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(QUANTITY_BOUNDS.max, Math.max(QUANTITY_BOUNDS.min, Math.round(value)));
    setQuantity(clamped);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm">
      <div className="mb-1 text-sm uppercase tracking-wide text-white/50">
        Capability translator
      </div>
      <p className="mb-5 text-sm text-white/40">
        Translate GPU power draw and compute throughput into relatable everyday
        terms.
      </p>

      {/* GPU picker */}
      <div className="mb-5">
        <div className="mb-2 text-xs uppercase tracking-wide text-white/40">GPU</div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select GPU">
          {GPU_STUB.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setSelectedGpuId(g.id);
                if (g.flops[precision] === undefined) {
                  const fallback = PRECISIONS.find((p) => g.flops[p.key] !== undefined);
                  if (fallback) setPrecision(fallback.key);
                }
              }}
              aria-pressed={g.id === selectedGpuId}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                g.id === selectedGpuId
                  ? "bg-white text-black"
                  : "border border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Precision selector */}
      <div className="mb-5">
        <div className="mb-2 text-xs uppercase tracking-wide text-white/40">Precision</div>
        <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1" role="group" aria-label="Select precision">
          {availablePrecisions.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPrecision(p.key)}
              aria-pressed={p.key === activePrecision}
              className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                p.key === activePrecision
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity control (hidden while constellation mode drives quantity) */}
      {!constellationMode && (
        <div className="mb-5">
          <label htmlFor={sliderId} className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Quantity
          </label>
          <div className="flex items-center gap-4">
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={quantityToSliderPosition(quantity)}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-white"
              aria-describedby={quantityInputId}
            />
            <input
              id={quantityInputId}
              type="number"
              min={QUANTITY_BOUNDS.min}
              max={QUANTITY_BOUNDS.max}
              value={quantity}
              onChange={(e) => onQuantityInputChange(Number(e.target.value))}
              className="w-28 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-sm text-white"
            />
          </div>
          <div className="mt-1 text-xs text-white/30">
            Slider uses a log scale — spans 1 to {QUANTITY_BOUNDS.max.toLocaleString()} GPUs.
          </div>
        </div>
      )}

      {/* Constellation-scale toggle */}
      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={constellationMode}
            onChange={(e) => setConstellationMode(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-white/5 accent-white"
          />
          Scale to full constellation
        </label>

        {constellationMode && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-amber-300/70">
              Hypothetical scenario — not a SpaceX-stated figure. Based on the FCC
              filing&apos;s request for {starmind.fccFiling.requestedSatellites.toLocaleString()}{" "}
              satellites.
            </p>
            <div>
              <label
                htmlFor={gpusPerSatelliteId}
                className="mb-1 block text-xs uppercase tracking-wide text-amber-300/70"
              >
                Assumed GPUs per satellite
              </label>
              <input
                id={gpusPerSatelliteId}
                type="number"
                min={1}
                max={1000}
                value={gpusPerSatellite}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setGpusPerSatellite(Math.min(1000, Math.max(1, Math.round(v))));
                }}
                className="w-28 rounded-lg border border-amber-300/30 bg-white/5 px-2 py-1 text-sm text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total power draw"
          value={totals.totalPowerW !== null ? formatPower(totals.totalPowerW) : "—"}
          sub={totals.totalPowerW === null ? "No published TDP for this GPU" : undefined}
        />
        <StatCard
          label={`Total compute (${activePrecision.toUpperCase()})`}
          value={totalFlops > 0 ? formatFlops(totalFlops) : "—"}
        />
      </div>

      {comparisons.length > 0 && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">
            Relatable comparisons
          </div>
          <RelatableComparisonList comparisons={comparisons} />
        </div>
      )}
    </div>
  );
}
