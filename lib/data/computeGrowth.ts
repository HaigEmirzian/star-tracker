const prospectus = "https://content.spacex.com/cms-assets/FINAL_Documents%20and%20Updates/Project%20Apex%20-%20Australian%20Wrap%20and%20S-1%20-%20Final%20%28Lodgement%204%20June%202026%29%20-%20Compressed%20vF.pdf";
const q2Results = "https://s21.q4cdn.com/184289198/files/doc_financials/2026/q2/SpaceX-Reports-Second-Quarter-2026-Results.pdf";
const q3Results = "https://www.sec.gov/Archives/edgar/data/1181412/000162828026066482/spaceexplorationtechnologi.htm";

// Reported nameplate compute draw (installed capacity, not utilization).
export const computeGrowth = [
  { date: "2023-12-31", gw: 0, source: prospectus },
  { date: "2024-12-31", gw: 0.3, source: prospectus },
  { date: "2025-03-31", gw: 0.3, source: prospectus },
  { date: "2025-06-30", gw: 0.4, source: q2Results },
  { date: "2025-09-30", gw: 0.6, source: q3Results },
  { date: "2025-12-31", gw: 0.8, source: prospectus },
  { date: "2026-03-31", gw: 1.0, source: q2Results },
  { date: "2026-06-30", gw: 1.4, source: q2Results },
  { date: "2026-09-30", gw: 1.7, source: q3Results },
];
