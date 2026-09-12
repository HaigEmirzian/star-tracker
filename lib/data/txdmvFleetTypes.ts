// Client-safe shapes for the live Texas DMV autonomous-vehicle registry.
// Zero imports, for the same reason as nhtsaRobotaxiTypes.ts: the fetcher
// pulls in `fs`/`path`, and a stray value-import from a component would drag
// Node built-ins into the client bundle and break the webpack build.

export interface FleetOperator {
  name: string;
  fleetSize: number;
  change7d: number;
  change30d: number;
  growth30dPct: number;
  /** Model name -> count, e.g. { "Model Y": 387, Cybercab: 45 }. */
  models: Record<string, number>;
  complaints: number;
  /** TxDMV's own record for this operator, for a "check the source" link. */
  registryUrl: string | null;
}

export interface FleetHistoryPoint {
  /** Short label as published, e.g. "Jun 9". */
  label: string;
  count: number;
}

export interface TxdmvFleetData {
  tesla: FleetOperator | null;
  /** Every authorised operator, largest first — Tesla's scale in context. */
  operators: FleetOperator[];
  /** Tesla's daily registered-fleet series. */
  history: FleetHistoryPoint[];
  totalActiveVehicles: number;
  generatedAt: string;
  fetchedAt: string;
  sourceLabel: string;
  sourceUrl: string;
}
