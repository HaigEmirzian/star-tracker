// Client-safe shapes for the NHTSA SGO incident data. Deliberately kept in a
// zero-import module: lib/data/nhtsaRobotaxi.ts pulls in `fs`, `path` and
// `csv-parse`, so a component that accidentally value-imports from it (rather
// than `import type`) would drag Node built-ins into the client bundle and
// break the webpack production build. Importing shapes from here makes that
// mistake structurally impossible instead of a thing everyone has to remember.

export interface RobotaxiIncident {
  reportId: string;
  incidentDate: string; // e.g. "JUN-2026", as NHTSA reports it (month granularity)
  city: string;
  state: string;
  driverOperatorType: string; // "None" (driverless) | "In-Vehicle (Commercial / Test)" | "Remote (Commercial / Test)"
  severity: string;
  // Truncated on the server. The raw NHTSA narratives run to multiple KB each
  // and all 44 of them used to cross the wire unrendered — the same reasoning
  // as "never ship the raw multi-MB CSV to the client", one level down.
  narrativeExcerpt: string;
}

export interface RobotaxiIncidentSummary {
  totalIncidents: number;
  byMonth: { month: string; count: number }[];
  byCity: { city: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  remoteOperatorIncidents: number;
  driverlessIncidents: number;
  latestIncident: RobotaxiIncident | null;
  fetchedAt: string;
}

export interface RobotaxiIncidentData {
  summary: RobotaxiIncidentSummary;
  incidents: RobotaxiIncident[];
}
