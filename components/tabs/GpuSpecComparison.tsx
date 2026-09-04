import type { ReactNode } from "react";
import Image from "next/image";
import type { CitedFigure, CpuSpec, GpuSpec } from "@/lib/data/gpuSpecs";
import { cpuSpecs, gpuSpecs } from "@/lib/data/gpuSpecs";

// Inline placeholder shown when Nvidia hasn't published a stable, hotlinkable
// product image for a part — a simple schematic chip icon, never a fake or
// guessed photo.
function ChipPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]"
      aria-label={`${label} — no official product image available`}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-12 w-12 text-white/20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="16" y="16" width="32" height="32" rx="2" />
        <rect x="26" y="26" width="12" height="12" rx="1" />
        <line x1="16" y1="24" x2="8" y2="24" />
        <line x1="16" y1="32" x2="8" y2="32" />
        <line x1="16" y1="40" x2="8" y2="40" />
        <line x1="48" y1="24" x2="56" y2="24" />
        <line x1="48" y1="32" x2="56" y2="32" />
        <line x1="48" y1="40" x2="56" y2="40" />
        <line x1="24" y1="16" x2="24" y2="8" />
        <line x1="32" y1="16" x2="32" y2="8" />
        <line x1="40" y1="16" x2="40" y2="8" />
        <line x1="24" y1="48" x2="24" y2="56" />
        <line x1="32" y1="48" x2="32" y2="56" />
        <line x1="40" y1="48" x2="40" y2="56" />
      </svg>
    </div>
  );
}

// Renders a cited figure like the app's existing LockedStat pattern
// (StarmindPanel.tsx) when the value is missing: a dim em dash plus a small
// "Not yet published" caption — never a guessed number.
function FigureCell<T>({
  figure,
  format,
}: {
  figure?: CitedFigure<T>;
  format: (v: T) => string;
}) {
  if (!figure) {
    return (
      <div>
        <div className="text-white/20">—</div>
        <div className="text-xs text-white/30">Not yet published</div>
      </div>
    );
  }
  return <div className="text-white">{format(figure.value)}</div>;
}

const numberFmt = (v: number) => v.toLocaleString();

// Shared card shell used for both Rubin (GPU) and Vera (CPU) so the two read
// as one matched pair, not a table plus a bolted-on card.
function HardwareCard({
  kicker,
  name,
  meta,
  description,
  rows,
  imageUrl,
  imageCaption,
}: {
  kicker: string;
  name: string;
  meta?: string;
  description: string;
  rows: { label: string; value: ReactNode }[];
  imageUrl?: string;
  imageCaption?: string;
}) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="mb-3 w-full">
        {imageUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/40">
            <Image
              src={imageUrl}
              alt={imageCaption ?? name}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-contain"
            />
          </div>
        ) : (
          <ChipPlaceholder label={name} />
        )}
      </div>
      <div className="text-xs uppercase tracking-wide text-white/40">{kicker}</div>
      <div className="mt-1 font-semibold text-white">{name}</div>
      {meta && <div className="mt-1 text-xs text-white/40">{meta}</div>}
      <div className="mt-2 text-sm text-white/50">{description}</div>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="text-white/40">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function gpuRows(gpu: GpuSpec): { label: string; value: ReactNode }[] {
  return [
    { label: "TDP", value: <FigureCell figure={gpu.tdpWatts} format={(v) => `${numberFmt(v)} W`} /> },
    { label: "Memory", value: <FigureCell figure={gpu.memoryCapacityGB} format={(v) => `${numberFmt(v)} GB`} /> },
    { label: "Memory bandwidth", value: <FigureCell figure={gpu.memoryBandwidthTBs} format={(v) => `${v} TB/s`} /> },
    { label: "FP4 Tensor Core", value: <FigureCell figure={gpu.flops.fp4} format={(v) => `${numberFmt(v)} TFLOPS`} /> },
    { label: "Interconnect bandwidth", value: <FigureCell figure={gpu.interconnectBandwidthGBs} format={(v) => `${numberFmt(v)} GB/s`} /> },
    { label: "Transistors", value: <FigureCell figure={gpu.transistorCountBillion} format={(v) => `${v}B`} /> },
    { label: "Streaming Multiprocessors", value: <FigureCell figure={gpu.smCount} format={numberFmt} /> },
    { label: "Tensor Cores", value: <FigureCell figure={gpu.tensorCoreCount} format={numberFmt} /> },
  ];
}

function cpuRows(cpu: CpuSpec): { label: string; value: ReactNode }[] {
  return [
    { label: "Cores", value: <FigureCell figure={cpu.cores} format={numberFmt} /> },
    { label: "Threads", value: <FigureCell figure={cpu.threads} format={numberFmt} /> },
    {
      label: "TDP",
      value: (
        <FigureCell
          figure={cpu.tdpWattsRange}
          format={([lo, hi]) => `${lo}-${hi} W`}
        />
      ),
    },
    { label: "L3 cache", value: <FigureCell figure={cpu.l3CacheMB} format={(v) => `${v} MB`} /> },
    { label: "Memory", value: <FigureCell figure={cpu.memoryCapacityTB} format={(v) => `${v} TB`} /> },
    { label: "Memory bandwidth", value: <FigureCell figure={cpu.memoryBandwidthTBs} format={(v) => `${v} TB/s`} /> },
    { label: "NVLink-C2C to GPU", value: <FigureCell figure={cpu.nvlinkC2CBandwidthTBs} format={(v) => `${v} TB/s`} /> },
  ];
}

export default function GpuSpecComparison() {
  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="text-sm uppercase tracking-wide text-white/50">
        Compute hardware specs
      </div>

      {/* Rubin (GPU) on the left, Vera (companion CPU) on the right — same
          card shell for both so they read as a matched pair. */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {gpuSpecs.map((gpu) => (
          <HardwareCard
            key={gpu.id}
            kicker={`${gpu.generation} · ${gpu.status}`}
            name={gpu.name}
            description={gpu.relationToStarmind}
            rows={gpuRows(gpu)}
            imageUrl={gpu.imageUrl}
            imageCaption={gpu.imageCaption}
          />
        ))}
        {cpuSpecs.map((cpu) => (
          <HardwareCard
            key={cpu.id}
            kicker="Companion CPU"
            name={cpu.name}
            description={cpu.role}
            rows={cpuRows(cpu)}
            imageUrl={cpu.imageUrl}
            imageCaption={cpu.imageCaption}
          />
        ))}
      </div>
    </div>
  );
}
