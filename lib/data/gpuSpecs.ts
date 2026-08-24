// Manually maintained, cited GPU/hardware spec data for the "Compute hardware
// specs" section of the Starmind panel. Every numeric figure below MUST carry
// a real, verifiable Nvidia source URL in its `source` field — never
// interpolate, estimate, or round from a non-Nvidia source. If Nvidia hasn't
// published a figure (common for Rubin, which is pre-launch), leave that
// field `undefined` and let the UI render it as pending — do not guess.
//
// `gpuSpecs` holds only hardware Starmind actually uses (Rubin). Don't add
// other Nvidia GPUs (B200, H100, etc.) here as "comparison points" — this
// page is a Starmind reference, not a general Nvidia GPU comparison tool.
//
// Units, fixed across this file:
//   - FLOPS figures are TFLOPS (teraFLOPS). Nvidia typically publishes Tensor
//     Core throughput in petaFLOPS "with sparsity" (2x the dense/no-sparsity
//     number) — where a cited figure is a sparsity figure, its CitedFigure
//     `note` says so explicitly, matching Nvidia's own datasheet footnotes.
//   - memoryBandwidthTBs is terabytes/second, interconnectBandwidthGBs is
//     gigabytes/second (matches how Nvidia publishes each, respectively).
//
// Important factual note: Nvidia's own Vera Rubin materials describe "Vera"
// as the Arm companion CPU in the platform — it is NOT a GPU and Nvidia has
// not published FLOPS figures for it. Vera must never appear in the GPU/
// FLOPS comparison table (see `cpuSpecs` below, kept separate from
// `gpuSpecs`).

export interface CitedFigure<T> {
  value: T;
  source: string; // URL to the specific Nvidia page/PDF/deck
  sourceLabel: string; // e.g. "Nvidia Blackwell datasheet"
  note?: string;
}

export interface GpuSpec {
  id: string;
  name: string;
  generation: string;
  announced: string;
  status: "announced" | "shipping" | "sampling";
  relationToStarmind: string;
  imageUrl?: string;
  // What the photo actually shows, since not every official photo is a
  // bare isolated die/module shot (e.g. Nvidia hasn't photographed a
  // standalone Rubin GPU — the only real photo available is of the Vera
  // Rubin compute tray). Defaults to the GPU name in the UI when omitted.
  imageCaption?: string;
  imageSourcePage: string;
  tdpWatts?: CitedFigure<number>;
  memoryCapacityGB?: CitedFigure<number>;
  memoryBandwidthTBs?: CitedFigure<number>;
  flops: {
    fp16?: CitedFigure<number>;
    fp8?: CitedFigure<number>;
    fp4?: CitedFigure<number>;
  };
  interconnectBandwidthGBs?: CitedFigure<number>;
  transistorCountBillion?: CitedFigure<number>;
  smCount?: CitedFigure<number>;
  tensorCoreCount?: CitedFigure<number>;
  lastUpdated: string;
}

export const gpuSpecs: GpuSpec[] = [
  {
    id: "rubin",
    name: "Nvidia Rubin",
    generation: "Rubin (Vera Rubin platform)",
    announced: "March 2025 (GTC), full-system detail at GTC 2026",
    status: "announced",
    relationToStarmind: "Named in Starmind's hardware stack",
    imageUrl:
      "https://iprsoftwaremedia.com/219/files/202603/69b832203d63321ac974de07_nvidia-vera-rubin-family/nvidia-vera-rubin-family_mid.jpg",
    imageCaption: "Vera Rubin compute tray (Nvidia has not photographed a standalone Rubin GPU)",
    imageSourcePage: "https://nvidianews.nvidia.com/news/nvidia-vera-rubin-platform",
    // Nvidia has not published a per-GPU TDP figure for Rubin as of this
    // writing (only system-level power, e.g. ~24kW for a full DGX Rubin
    // NVL8 tray) — left undefined rather than using unconfirmed third-party
    // leak numbers. Same for FP16/FP8 Tensor Core throughput: Nvidia has
    // only published NVFP4 figures for Rubin so far.
    memoryCapacityGB: {
      value: 288,
      source: "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
      sourceLabel: "Nvidia Developer Blog — Inside NVIDIA Rubin GPU Architecture",
      note: "Up to 288 GB of HBM4 memory per GPU",
    },
    memoryBandwidthTBs: {
      value: 22,
      source: "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
      sourceLabel: "Nvidia Developer Blog — Inside NVIDIA Rubin GPU Architecture",
      note: "Up to 22 TB/s of peak HBM4 bandwidth per GPU",
    },
    flops: {
      fp4: {
        value: 50_000,
        source: "https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer",
        sourceLabel: "Nvidia Newsroom — Rubin platform announcement",
        note: "50 petaflops of NVFP4 compute for AI inference (35 petaflops for training), as stated by Nvidia",
      },
    },
    interconnectBandwidthGBs: {
      value: 3600,
      source: "https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer",
      sourceLabel: "Nvidia Newsroom — Rubin platform announcement",
      note: "Per-GPU NVLink bandwidth (\"each GPU offers 3.6TB/s of bandwidth\"); the Vera Rubin NVL72 rack aggregates to 260TB/s",
    },
    transistorCountBillion: {
      value: 336,
      source: "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
      sourceLabel: "Nvidia Developer Blog — Inside NVIDIA Rubin GPU Architecture",
      note: "336-billion-transistor multi-chip module design",
    },
    smCount: {
      value: 224,
      source: "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
      sourceLabel: "Nvidia Developer Blog — Inside NVIDIA Rubin GPU Architecture",
      note: "224 Streaming Multiprocessors (SMs)",
    },
    tensorCoreCount: {
      value: 896,
      source: "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
      sourceLabel: "Nvidia Developer Blog — Inside NVIDIA Rubin GPU Architecture",
      note: "896 Tensor Cores with expanded precision",
    },
    lastUpdated: "2026-08-24",
  },
];

export interface CpuSpec {
  id: string;
  name: string;
  cores?: CitedFigure<number>;
  threads?: CitedFigure<number>;
  // A range, not a single number: Nvidia publishes Vera's TDP as a
  // configurable window rather than one fixed figure.
  tdpWattsRange?: CitedFigure<[number, number]>;
  memoryCapacityTB?: CitedFigure<number>;
  memoryBandwidthTBs?: CitedFigure<number>;
  nvlinkC2CBandwidthTBs?: CitedFigure<number>;
  l3CacheMB?: CitedFigure<number>;
  role: string;
  imageUrl?: string;
  // See GpuSpec.imageCaption — same reasoning applies here.
  imageCaption?: string;
  imageSourcePage: string;
  lastUpdated: string;
}

export const cpuSpecs: CpuSpec[] = [
  {
    id: "vera",
    name: "Nvidia Vera",
    cores: {
      value: 88,
      source: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
      sourceLabel: "Nvidia Vera CPU product page",
      note: "88 custom Arm \"Olympus\" cores",
    },
    threads: {
      value: 176,
      source: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
      sourceLabel: "Nvidia Vera CPU product page",
      note: "176 threads with partitioned core resources",
    },
    tdpWattsRange: {
      value: [250, 450],
      source: "https://developer.nvidia.com/blog/nvidia-vera-cpu-sets-a-new-standard-for-agentic-workloads-in-ai-factories/",
      sourceLabel: "Nvidia Developer Blog — Vera CPU for agentic workloads",
      note: "Configurable 250W–450W TDP range",
    },
    l3CacheMB: {
      value: 164,
      source: "https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/",
      sourceLabel: "Nvidia Developer Blog — Inside the NVIDIA Rubin Platform",
      note: "164 MB unified L3 cache",
    },
    memoryCapacityTB: {
      value: 1.5,
      source: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
      sourceLabel: "Nvidia Vera CPU product page",
      note: "Up to 1.5 TB of LPDDR5X memory",
    },
    memoryBandwidthTBs: {
      value: 1.2,
      source: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
      sourceLabel: "Nvidia Vera CPU product page",
      note: "Up to 1.2 TB/s of LPDDR5X memory bandwidth",
    },
    nvlinkC2CBandwidthTBs: {
      value: 1.8,
      source: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
      sourceLabel: "Nvidia Vera CPU product page",
      note: "Up to 1.8 TB/s of coherent NVLink-C2C bandwidth to Rubin GPUs",
    },
    role: "Arm companion CPU in the Vera Rubin platform — not a GPU, and Nvidia has not published FLOPS figures for it. Handles agentic AI/RL orchestration, tool execution, and data pipelines alongside Rubin GPUs.",
    imageUrl: "/images/starmind/vera-cpu-die.jpg",
    imageCaption: "Vera CPU die shot (Nvidia, via Sawyer Merritt)",
    imageSourcePage: "https://x.com/SawyerMerritt/status/2091911938947035434",
    lastUpdated: "2026-08-24",
  },
];
