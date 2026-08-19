import type { ReactNode } from "react";
import Image from "next/image";
import type { CitedFigure, CpuSpec, GpuSpec } from "@/lib/data/gpuSpecs";
import { cpuSpecs, gpuSpecs } from "@/lib/data/gpuSpecs";

// Inline placeholder shown when Nvidia hasn't published a stable, hotlinkable
// product image for a part (Rubin/Vera currently only exist as keynote-slide
// renders) — a simple schematic chip icon, never a fake or guessed photo.
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

function GpuImage({ gpu }: { gpu: GpuSpec }) {
  if (!gpu.imageUrl) {
    return <ChipPlaceholder label={gpu.name} />;
  }
  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/40">
        <Image
          src={gpu.imageUrl}
          alt={gpu.imageCaption ?? gpu.name}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-contain"
        />
      </div>
      <a
        href={gpu.imageSourcePage}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block text-xs text-white/30 underline decoration-white/20 hover:text-white/50"
      >
        {gpu.imageCaption ?? "Photo: Nvidia"}
      </a>
    </div>
  );
}

// Renders a cited figure like the app's existing LockedStat pattern
// (StarmindPanel.tsx) when the value is missing: a dim em dash plus a small
// "Not yet published" caption — never a guessed number.
function FigureCell({
  figure,
  format,
}: {
  figure?: CitedFigure<number>;
  format: (v: number) => string;
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

const specRows: {
  label: string;
  render: (gpu: GpuSpec) => ReactNode;
}[] = [
  {
    label: "TDP",
    render: (gpu) => (
      <FigureCell figure={gpu.tdpWatts} format={(v) => `${numberFmt(v)} W`} />
    ),
  },
  {
    label: "Memory",
    render: (gpu) => (
      <FigureCell
        figure={gpu.memoryCapacityGB}
        format={(v) => `${numberFmt(v)} GB`}
      />
    ),
  },
  {
    label: "Memory bandwidth",
    render: (gpu) => (
      <FigureCell
        figure={gpu.memoryBandwidthTBs}
        format={(v) => `${v} TB/s`}
      />
    ),
  },
  {
    label: "FP16 Tensor Core",
    render: (gpu) => (
      <FigureCell
        figure={gpu.flops.fp16}
        format={(v) => `${numberFmt(v)} TFLOPS`}
      />
    ),
  },
  {
    label: "FP8 Tensor Core",
    render: (gpu) => (
      <FigureCell
        figure={gpu.flops.fp8}
        format={(v) => `${numberFmt(v)} TFLOPS`}
      />
    ),
  },
  {
    label: "FP4 Tensor Core",
    render: (gpu) => (
      <FigureCell
        figure={gpu.flops.fp4}
        format={(v) => `${numberFmt(v)} TFLOPS`}
      />
    ),
  },
  {
    label: "Interconnect bandwidth",
    render: (gpu) => (
      <FigureCell
        figure={gpu.interconnectBandwidthGBs}
        format={(v) => `${numberFmt(v)} GB/s`}
      />
    ),
  },
];

function collectFootnotes(gpus: GpuSpec[], cpus: CpuSpec[]) {
  const seen = new Map<string, { label: string; source: string }>();
  const add = (fig?: CitedFigure<unknown>) => {
    if (!fig) return;
    seen.set(fig.source, { label: fig.sourceLabel, source: fig.source });
  };
  for (const gpu of gpus) {
    add(gpu.tdpWatts);
    add(gpu.memoryCapacityGB);
    add(gpu.memoryBandwidthTBs);
    add(gpu.flops.fp16);
    add(gpu.flops.fp8);
    add(gpu.flops.fp4);
    add(gpu.interconnectBandwidthGBs);
  }
  for (const cpu of cpus) {
    add(cpu.cores);
    add(cpu.tdpWatts);
  }
  return Array.from(seen.values());
}

export default function GpuSpecComparison() {
  const footnotes = collectFootnotes(gpuSpecs, cpuSpecs);

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="text-sm uppercase tracking-wide text-white/50">
        Compute hardware specs
      </div>

      {/* Desktop / tablet: real comparison table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm sm:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="w-40 p-4 text-left font-normal text-white/40">
                &nbsp;
              </th>
              {gpuSpecs.map((gpu) => (
                <th key={gpu.id} className="p-4 text-left align-top">
                  <div className="mb-3 w-40">
                    <GpuImage gpu={gpu} />
                  </div>
                  <div className="font-semibold text-white">{gpu.name}</div>
                  <div className="mt-1 text-xs text-white/40">
                    {gpu.generation} · {gpu.status}
                  </div>
                  <div className="mt-1 text-xs text-white/30">
                    {gpu.relationToStarmind}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specRows.map((row) => (
              <tr key={row.label} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-white/40">{row.label}</td>
                {gpuSpecs.map((gpu) => (
                  <td key={gpu.id} className="p-4">
                    {row.render(gpu)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked per-GPU cards to avoid horizontal scroll */}
      <div className="flex flex-col gap-4 sm:hidden">
        {gpuSpecs.map((gpu) => (
          <div
            key={gpu.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <div className="mb-3">
              <GpuImage gpu={gpu} />
            </div>
            <div className="font-semibold text-white">{gpu.name}</div>
            <div className="mt-1 text-xs text-white/40">
              {gpu.generation} · {gpu.status}
            </div>
            <div className="mt-1 text-xs text-white/30">
              {gpu.relationToStarmind}
            </div>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              {specRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="text-white/40">{row.label}</dt>
                  <dd>{row.render(gpu)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Vera: standalone companion-CPU card, deliberately separate from the
          GPU/FLOPS table above — it is not a GPU. */}
      {cpuSpecs.map((cpu) => (
        <div
          key={cpu.id}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
        >
          <div className="mb-3 w-full">
            {cpu.imageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/40">
                <Image
                  src={cpu.imageUrl}
                  alt={cpu.imageCaption ?? cpu.name}
                  fill
                  sizes="(min-width: 640px) 24rem, 100vw"
                  className="object-contain"
                />
              </div>
            ) : (
              <ChipPlaceholder label={cpu.name} />
            )}
          </div>
          <div className="text-xs uppercase tracking-wide text-white/40">
            Companion CPU
          </div>
          <div className="mt-1 font-semibold text-white">{cpu.name}</div>
          <div className="mt-2 text-sm text-white/50">{cpu.role}</div>
          <dl className="mt-3 flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Cores</dt>
              <dd>
                <FigureCell figure={cpu.cores} format={numberFmt} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/40">TDP</dt>
              <dd>
                <FigureCell figure={cpu.tdpWatts} format={(v) => `${numberFmt(v)} W`} />
              </dd>
            </div>
          </dl>
          <a
            href={cpu.imageSourcePage}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-white/30 underline decoration-white/20 hover:text-white/50"
          >
            {cpu.imageCaption ?? "Source: Nvidia"}
          </a>
        </div>
      ))}

      <ul className="flex flex-col gap-1 text-xs text-white/30">
        {footnotes.map((fn) => (
          <li key={fn.source}>
            <a
              href={fn.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/20 hover:text-white/50"
            >
              {fn.label}
            </a>
          </li>
        ))}
      </ul>

      <p className="text-xs text-white/30">
        Data last updated{" "}
        {[...gpuSpecs, ...cpuSpecs]
          .map((s) => s.lastUpdated)
          .sort()
          .at(-1)}
      </p>
    </div>
  );
}
