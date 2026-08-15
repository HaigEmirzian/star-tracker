// Manually maintained public figures with no live API source. Update the
// values and lastUpdated date as SpaceX/FCC publish new numbers — never
// interpolate or estimate beyond what's been publicly stated.
export const starlinkNetwork = {
  lastUpdated: "2026-08-15",
  cumulativeCapacityTbps: 600,
  note: "Cumulative network capacity across the constellation, per SpaceX public statements",
  gen3CapacityPerSatelliteTbps: 1,
  gen3CapacityPerLaunchTbps: 60,
};

export const firstLaunchDate = "2019-05-23"; // first 60-satellite Starlink batch

// Manually maintained. Update when FCC authorization status changes —
// there is no reliable free live API for these figures.
export const fccStarlinkAuthorization = {
  lastUpdated: "2026-08-15",
  generations: [
    {
      label: "Gen1",
      authorized: 4408,
      note: "Original constellation authorization",
    },
    {
      label: "Gen2",
      authorized: 15000,
      note: "7,500 additional satellites approved January 2026, bringing Gen2 total to 15,000",
    },
    {
      label: "Gen3",
      authorized: 0,
      requested: 100000,
      note: "Application filed July 2026, pending FCC review",
    },
  ],
};
