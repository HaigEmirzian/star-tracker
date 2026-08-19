import type { CitedFigure } from "@/lib/data/gpuSpecs";

// Manually maintained. Starmind has no live telemetry or deployment data
// yet — these are the publicly confirmed program facts only. Do not add
// numeric power/compute/satellite-count figures here until SpaceX/Nvidia
// disclose them; the UI should show those fields as locked/pending.
//
// `factory`, `satelliteSpecs`, and `perSatelliteHardware` below use
// `CitedFigure` (unlike the older plain fields above them) because, unlike
// the FCC filing, these facts come from press coverage of SpaceX's live
// Aug 2026 reveal rather than one single filing/announcement — each number
// needs its own citation. Several of these figures (satellite power, in
// particular) have already been revised upward once by SpaceX; per policy
// here, only the latest confirmed figure is shown, with no mention of the
// superseded one.
export const starmind = {
  lastUpdated: "2026-08-19",
  status: "PRE-DEPLOYMENT" as const,
  confirmedDate: "2026-06-24",
  partner: "Nvidia",
  partnershipAnnounced: "2026-08-04",
  hardware: {
    gpu: "Nvidia Rubin",
    cpu: "Nvidia Vera",
  },
  prototype: {
    name: "AI1",
    targetLaunch: "Early 2027",
    massProductionStart: "Late 2027",
    factory: "Gigasat",
    satellitesPerStarshipMission: "30-50",
  },
  fccFiling: {
    filedDate: "2026-01-30",
    requestedSatellites: 1_000_000,
    altitudeRangeKm: [500, 2000] as [number, number],
    inclinations: "Sun-synchronous and 30°",
    milestoneWaiverRequested: true,
  },
  factory: {
    location: "Bastrop, Texas",
    sizeSqFt: {
      value: 11_000_000,
      source:
        "https://www.tomshardware.com/tech-industry/big-tech/spacex-unveils-11-million-square-foot-gigasat-factory-a-new-manufacturing-facility-for-space-based-data-centers-aims-for-1-gw-year-of-space-ai-compute-by-late-2027-from-its-satellites",
      sourceLabel: "Tom's Hardware — Gigasat Factory coverage",
      note: "Up to 11M sq ft across 1,000+ acres; vertically integrated from solar ingots/wafers to assembled satellites",
    } as CitedFigure<number>,
    computeTargetGwPerYear: {
      value: 1,
      source:
        "https://www.tomshardware.com/tech-industry/big-tech/spacex-unveils-11-million-square-foot-gigasat-factory-a-new-manufacturing-facility-for-space-based-data-centers-aims-for-1-gw-year-of-space-ai-compute-by-late-2027-from-its-satellites",
      sourceLabel: "Tom's Hardware — Gigasat Factory coverage",
      note: "SpaceX's stated target: 1 GW/year of orbital AI compute capacity by late 2027, scaling roughly 10x/year thereafter",
    } as CitedFigure<number>,
    targetYear: "2027",
  },
  satelliteSpecs: {
    heightM: {
      value: 20,
      source:
        "https://www.notebookcheck.net/SpaceX-lists-AI1-satellite-cooling-specs-for-Starmind-data-center-in-space.1340218.0.html",
      sourceLabel: "Notebookcheck, citing SpaceX's Starmind site",
      note: "Fully deployed height",
    } as CitedFigure<number>,
    wingspanM: {
      value: 70,
      source:
        "https://www.notebookcheck.net/SpaceX-lists-AI1-satellite-cooling-specs-for-Starmind-data-center-in-space.1340218.0.html",
      sourceLabel: "Notebookcheck, citing SpaceX's Starmind site",
      note: "Fully unfolded solar array wingspan",
    } as CitedFigure<number>,
    orbitAltitudeKm: {
      value: 600,
      source:
        "https://www.notebookcheck.net/SpaceX-lists-AI1-satellite-cooling-specs-for-Starmind-data-center-in-space.1340218.0.html",
      sourceLabel: "Notebookcheck, citing SpaceX's Starmind site",
      note: "AI1 prototype's stated operating altitude, sun-synchronous orbit",
    } as CitedFigure<number>,
    avgPowerKw: {
      value: 160,
      source: "https://financefeeds.com/spacex-partners-with-nvidia-to-build-starmind-orbital-ai-data-center-satellites/",
      sourceLabel: "FinanceFeeds — Starmind orbital AI data center coverage",
      note: "Average AI processing power draw, as of SpaceX's Aug 2026 update",
    } as CitedFigure<number>,
    peakPowerKw: {
      value: 250,
      source:
        "https://www.sahmcapital.com/news/content/nvidia-nvda-secures-exclusive-chips-role-in-orbital-ai-data-centers-2026-08-08",
      sourceLabel: "Sahm Capital — Nvidia exclusive chips role coverage",
      note: "Peak power, as of SpaceX's Aug 2026 update — enough to support a full Vera Rubin NVL72 rack",
    } as CitedFigure<number>,
    solarArrayKw: {
      value: 210,
      source: "https://financefeeds.com/spacex-partners-with-nvidia-to-build-starmind-orbital-ai-data-center-satellites/",
      sourceLabel: "FinanceFeeds — Starmind orbital AI data center coverage",
    } as CitedFigure<number>,
    radiatorAreaM2: {
      value: 110,
      source:
        "https://www.notebookcheck.net/SpaceX-lists-AI1-satellite-cooling-specs-for-Starmind-data-center-in-space.1340218.0.html",
      sourceLabel: "Notebookcheck, citing SpaceX's Starmind site",
      note: "Liquid radiators, redundant pumped loops, with micrometeoroid/debris shielding — rejects heat into vacuum since there's no convection in orbit",
    } as CitedFigure<number>,
  },
  perSatelliteHardware: {
    rubinGpuCount: {
      value: 72,
      source:
        "https://www.sahmcapital.com/news/content/nvidia-nvda-secures-exclusive-chips-role-in-orbital-ai-data-centers-2026-08-08",
      sourceLabel: "Sahm Capital — Nvidia exclusive chips role coverage",
      note: "Full Vera Rubin NVL72-equivalent rack per satellite",
    } as CitedFigure<number>,
    veraCpuCount: {
      value: 36,
      source:
        "https://www.sahmcapital.com/news/content/nvidia-nvda-secures-exclusive-chips-role-in-orbital-ai-data-centers-2026-08-08",
      sourceLabel: "Sahm Capital — Nvidia exclusive chips role coverage",
    } as CitedFigure<number>,
    configDescription: "NVL72-equivalent rack",
  },
  description:
    "Starmind is SpaceX's orbital AI data center program, built in partnership with Nvidia. Satellites carry onboard GPUs/CPUs to run AI inference directly in orbit, powered by continuous solar exposure, with results downlinked in milliseconds — no ground data center relay required.",
};
