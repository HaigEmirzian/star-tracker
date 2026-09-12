"use client";

import { useState } from "react";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxiTypes";
import { SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

const INITIAL_ROWS = 8;

// The full NHTSA incident list. These rows were already crossing the wire
// before this panel existed — they just weren't rendered.
export default function RobotaxiIncidentTable({ incidents }: { incidents: RobotaxiIncidentData | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!incidents || incidents.incidents.length === 0) return null;

  // NHTSA reports at month granularity, so within a month the file order is
  // all we have — no false precision from a fabricated sort key.
  const rows = expanded ? incidents.incidents : incidents.incidents.slice(0, INITIAL_ROWS);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <SectionLabel right={`${incidents.incidents.length} reports`}>Incident log</SectionLabel>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/35">
              <th scope="col" className="py-1.5 pr-3 font-medium">Report</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Date</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Location</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Operator</th>
              <th scope="col" className="py-1.5 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((incident) => (
              <tr key={incident.reportId} className="align-top">
                <td className="py-1.5 pr-3 font-mono text-[10px] tabular-nums text-white/40">
                  {incident.reportId}
                </td>
                <td className="py-1.5 pr-3 font-mono text-[10px] tabular-nums text-white/70">
                  {incident.incidentDate}
                </td>
                <td className="py-1.5 pr-3 text-[11px] text-white/60">
                  {incident.city}, {incident.state}
                </td>
                <td className="py-1.5 pr-3 text-[11px] text-white/50">
                  {incident.driverOperatorType === "None" ? "Driverless" : incident.driverOperatorType}
                </td>
                <td className="py-1.5 text-[11px] text-white/50">{incident.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {incidents.incidents.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:text-white"
        >
          {expanded ? "Show fewer" : `Show all ${incidents.incidents.length}`}
        </button>
      )}
    </div>
  );
}
