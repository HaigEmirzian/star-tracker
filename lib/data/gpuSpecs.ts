// Manually maintained, cited GPU/hardware spec data for the "Compute hardware
// specs" section of the Starmind panel. Every numeric figure below MUST carry
// a real, verifiable Nvidia source URL in its `source` field — never
// interpolate, estimate, or round from a non-Nvidia source. If Nvidia hasn't
// published a figure (common for Rubin, which is pre-launch), leave that
// field `undefined` and let the UI render it as pending — do not guess.
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
    imageSourcePage: "https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer",
    // Nvidia has not published per-GPU TDP, memory capacity, or memory
    // bandwidth for the standalone Rubin GPU as of this writing — those
    // figures are disclosed only at the Vera Rubin NVL72 rack level, which
    // isn't a like-for-like comparison with the single-GPU rows below. Left
    // undefined rather than derived/estimated.
    flops: {
      fp4: {
        value: 50_000,
        source: "https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer",
        sourceLabel: "Nvidia Newsroom — Rubin platform announcement",
        note: "50 petaflops of NVFP4 compute for AI inference, as stated by Nvidia",
      },
    },
    interconnectBandwidthGBs: {
      value: 3600,
      source: "https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer",
      sourceLabel: "Nvidia Newsroom — Rubin platform announcement",
      note: "Per-GPU NVLink bandwidth (\"each GPU offers 3.6TB/s of bandwidth\"); the Vera Rubin NVL72 rack aggregates to 260TB/s",
    },
    lastUpdated: "2026-08-16",
  },
  {
    id: "b200",
    name: "Nvidia B200 (Blackwell)",
    generation: "Blackwell",
    announced: "March 2024 (GTC)",
    status: "shipping",
    relationToStarmind: "Comparison point",
    imageUrl:
      "https://www.nvidia.com/content/dam/en-zz/Solutions/data-center/dgx-b200/dgx-b200-hero-bm-v2-l580-d.jpg",
    imageSourcePage: "https://www.nvidia.com/en-us/data-center/dgx-b200/",
    tdpWatts: {
      value: 1000,
      source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
      sourceLabel: "Nvidia Blackwell datasheet",
      note: "Configurable up to 1,000W; individual GPU spec within an 8-GPU HGX B200 baseboard",
    },
    memoryCapacityGB: {
      value: 180,
      source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
      sourceLabel: "Nvidia Blackwell datasheet",
      note: "180GB HBM3e per GPU, HGX B200 configuration",
    },
    memoryBandwidthTBs: {
      value: 7.7,
      source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
      sourceLabel: "Nvidia Blackwell datasheet",
    },
    flops: {
      fp16: {
        value: 4500,
        source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
        sourceLabel: "Nvidia Blackwell datasheet",
        note: "4.5 petaFLOPS FP16/BF16 Tensor Core, with sparsity",
      },
      fp8: {
        value: 9000,
        source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
        sourceLabel: "Nvidia Blackwell datasheet",
        note: "9 petaFLOPS FP8/FP6 Tensor Core, with sparsity",
      },
      fp4: {
        value: 18_000,
        source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
        sourceLabel: "Nvidia Blackwell datasheet",
        note: "18 petaFLOPS FP4 Tensor Core, with sparsity",
      },
    },
    interconnectBandwidthGBs: {
      value: 1800,
      source: "https://resources.nvidia.com/en-us-blackwell-architecture/datasheet",
      sourceLabel: "Nvidia Blackwell datasheet",
      note: "5th-generation NVLink, GPU-to-GPU",
    },
    lastUpdated: "2026-08-16",
  },
  {
    id: "h100",
    name: "Nvidia H100 (Hopper, SXM5)",
    generation: "Hopper",
    announced: "March 2022 (GTC)",
    status: "shipping",
    relationToStarmind: "Comparison point",
    imageSourcePage: "https://www.nvidia.com/en-us/data-center/h100/",
    tdpWatts: {
      value: 700,
      source: "https://www.nvidia.com/en-us/data-center/h100/",
      sourceLabel: "Nvidia H100 product page",
      note: "Up to 700W, configurable, SXM5",
    },
    memoryCapacityGB: {
      value: 80,
      source: "https://www.nvidia.com/en-us/data-center/h100/",
      sourceLabel: "Nvidia H100 product page",
    },
    memoryBandwidthTBs: {
      value: 3.35,
      source: "https://www.nvidia.com/en-us/data-center/h100/",
      sourceLabel: "Nvidia H100 product page",
    },
    flops: {
      fp16: {
        value: 1979,
        source: "https://www.nvidia.com/en-us/data-center/h100/",
        sourceLabel: "Nvidia H100 product page",
        note: "1,979 teraFLOPS FP16 Tensor Core, with sparsity",
      },
      fp8: {
        value: 3958,
        source: "https://www.nvidia.com/en-us/data-center/h100/",
        sourceLabel: "Nvidia H100 product page",
        note: "3,958 teraFLOPS FP8 Tensor Core, with sparsity",
      },
      // Hopper predates Blackwell's native FP4 Tensor Core support — Nvidia
      // has not published an FP4 figure for H100. Left undefined.
    },
    interconnectBandwidthGBs: {
      value: 900,
      source: "https://www.nvidia.com/en-us/data-center/h100/",
      sourceLabel: "Nvidia H100 product page",
      note: "NVLink, SXM5",
    },
    lastUpdated: "2026-08-16",
  },
];

export interface CpuSpec {
  id: string;
  name: string;
  cores?: CitedFigure<number>;
  tdpWatts?: CitedFigure<number>;
  role: string;
  imageUrl?: string;
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
      note: "88 custom Arm \"Olympus\" cores, 176 threads",
    },
    // Nvidia has not published a TDP figure for Vera. Left undefined.
    role: "Arm companion CPU in the Vera Rubin platform — not a GPU, and Nvidia has not published FLOPS figures for it. Handles agentic AI/RL orchestration, tool execution, and data pipelines alongside Rubin GPUs.",
    imageSourcePage: "https://www.nvidia.com/en-us/data-center/vera-cpu/",
    lastUpdated: "2026-08-16",
  },
];
