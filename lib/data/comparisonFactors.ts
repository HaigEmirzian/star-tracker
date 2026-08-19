// Manually maintained, cited conversion constants used by the Capability
// Translator (Starmind tab) to turn large power/compute numbers into
// relatable everyday comparisons. Same discipline as fccStatic.ts /
// starmindStatic.ts: every figure below must trace to a real, publicly
// published source — never interpolate, round to a "nice" number beyond
// what the source itself rounds to, or invent a plausible-looking value.
// Update `lastUpdated` on each constant when the underlying source changes.
export interface CitedConstant {
  value: number;
  unit: string;
  source: string;
  sourceLabel: string;
  lastUpdated: string;
}

export const comparisonFactors = {
  // Average continuous power draw of a US home, derived from EIA's most
  // recent annual residential consumption figure (10,791 kWh/year in 2022)
  // divided by hours per year (8,760): 10,791 / 8,760 = 1.2318 kW.
  avgUsHomePowerDrawKw: {
    value: 1.23,
    unit: "kW (average continuous draw)",
    source: "https://www.eia.gov/tools/faqs/faq.php?id=97&t=3",
    sourceLabel:
      "U.S. EIA — average annual residential electricity use, 10,791 kWh (2022)",
    lastUpdated: "2026-08-16",
  },
  // Usable battery capacity of a 2026 Tesla Model 3 Long Range, per EPA
  // certification data.
  teslaModel3BatteryKwh: {
    value: 82.0,
    unit: "kWh (usable)",
    source: "https://www.autoblog.com/features/tesla-long-range-model-3-battery",
    sourceLabel:
      "EPA certification data for the 2026 Tesla Model 3 Long Range, reported by Autoblog",
    lastUpdated: "2026-08-16",
  },
  // Average electrical output of a US nuclear power plant, per the
  // Department of Energy's Office of Nuclear Energy.
  nuclearPlantOutputMw: {
    value: 1000,
    unit: "MW",
    source:
      "https://www.energy.gov/ne/articles/infographic-how-much-power-does-nuclear-reactor-produce",
    sourceLabel:
      "U.S. DOE Office of Nuclear Energy — \"around 1 gigawatt of power per plant on average\"",
    lastUpdated: "2026-08-16",
  },
  // Average nameplate capacity of a newly installed US wind turbine (2023).
  windTurbineOutputMw: {
    value: 3.4,
    unit: "MW",
    source: "https://www.energy.gov/cmei/systems/land-based-wind-market-report-2024-edition",
    sourceLabel:
      "U.S. DOE Land-Based Wind Market Report, 2024 Edition — average nameplate capacity of turbines installed in 2023",
    lastUpdated: "2026-08-16",
  },
  // PlayStation 5 GPU compute throughput — a direct FLOPS-to-FLOPS
  // comparison, unlike a TOPS-based figure (e.g. a phone's integer/
  // quantized Neural Engine spec), since both this and the GPU flops
  // figures elsewhere in this app are floating-point operations/sec. Sony
  // doesn't restate the number on playstation.com's consumer spec pages —
  // it comes from Mark Cerny's official "Road to PS5" presentation (March
  // 2020), reported here via Android Central's coverage, titled "PS5 specs
  // officially detailed by Sony."
  //
  // Still an approximation, not a precise equivalence: this is dense FP32
  // GPU shader throughput (gaming workload), not Tensor Core matrix-multiply
  // FLOPS at a specific precision (the figures used elsewhere in this app)
  // — different hardware, same unit family. Any comparison using this
  // constant should note that.
  ps5GpuTflops: {
    value: 10.28,
    unit: "TFLOPS (FP32 GPU compute)",
    source: "https://www.androidcentral.com/ps5-specs-detailed-mark-cerny",
    sourceLabel:
      "Android Central — \"PS5 specs officially detailed by Sony\" (from Mark Cerny's Road to PS5 presentation)",
    lastUpdated: "2026-08-19",
  },
} satisfies Record<string, CitedConstant>;
