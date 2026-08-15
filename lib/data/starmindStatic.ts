// Manually maintained. Starmind has no live telemetry or deployment data
// yet — these are the publicly confirmed program facts only. Do not add
// numeric power/compute/satellite-count figures here until SpaceX/Nvidia
// disclose them; the UI should show those fields as locked/pending.
export const starmind = {
  lastUpdated: "2026-08-15",
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
  description:
    "Starmind is SpaceX's orbital AI data center program, built in partnership with Nvidia. Satellites carry onboard GPUs/CPUs to run AI inference directly in orbit, powered by continuous solar exposure, with results downlinked in milliseconds — no ground data center relay required.",
};
