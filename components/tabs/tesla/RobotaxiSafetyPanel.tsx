import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxiTypes";
import { regulatoryActions } from "@/lib/data/robotaxiStatic";
import { BarRow, Pill, SectionLabel, stampUtc } from "@/components/tabs/tesla/robotaxiUi";

// Consumes the live NHTSA summary fields that were previously shipped to the
// client and never rendered: byMonth, byCity, bySeverity, the driverless /
// remote-operator split, and latestIncident.
//
// Deliberately absent: an incidents-per-mile rate. NHTSA's reports cover all
// Tesla ADS operation while Tesla's mileage figures cover paid miles only, so
// dividing one by the other invents a denominator. That gap is listed
// explicitly in `notDisclosed` instead.

export default function RobotaxiSafetyPanel({ incidents }: { incidents: RobotaxiIncidentData | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
        <SectionLabel right={incidents ? "NHTSA SGO 2021-01 · ADS" : undefined}>
          Reported incidents
        </SectionLabel>

        {!incidents ? (
          <p className="py-6 text-center text-xs text-white/30">NHTSA feed unavailable right now.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: incidents.summary.totalIncidents },
                { label: "Driverless", value: incidents.summary.driverlessIncidents },
                { label: "Remote operator", value: incidents.summary.remoteOperatorIncidents },
              ].map((s) => (
                <div key={s.label} className="rounded border border-white/10 bg-black/20 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</div>
                  <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">By severity</div>
                <div className="flex flex-col gap-1">
                  {[...incidents.summary.bySeverity]
                    .sort((a, b) => b.count - a.count)
                    .map((s) => (
                      <BarRow
                        key={s.severity}
                        label={s.severity}
                        count={s.count}
                        max={incidents.summary.totalIncidents}
                      />
                    ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">By city</div>
                <div className="flex flex-col gap-1">
                  {incidents.summary.byCity.map((c) => (
                    <BarRow
                      key={c.city}
                      label={c.city}
                      count={c.count}
                      max={incidents.summary.totalIncidents}
                      labelWidth="w-24"
                    />
                  ))}
                </div>
              </div>
            </div>

            {incidents.summary.latestIncident && (
              <div className="mt-3 rounded border border-white/10 bg-black/20 p-2">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-white/35">
                  <span>Most recent</span>
                  <span className="font-mono text-white/50">
                    {incidents.summary.latestIncident.incidentDate}
                  </span>
                  <span className="text-white/50">
                    {incidents.summary.latestIncident.city}, {incidents.summary.latestIncident.state}
                  </span>
                  <span className="text-white/30">
                    operator: {incidents.summary.latestIncident.driverOperatorType || "—"}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-white/45">
                  {incidents.summary.latestIncident.narrativeExcerpt}
                </p>
              </div>
            )}

            <p className="mt-2 text-[10px] text-white/25">
              Every company deploying SAE Level 3+ automated driving on public roads must report crashes
              under NHTSA&rsquo;s Standing General Order. This is the ADS dataset, filtered to Tesla — separate
              from the ADAS file that covers consumer FSD. Fetched {stampUtc(incidents.summary.fetchedAt)} UTC.
            </p>
          </>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
        <SectionLabel right={`${regulatoryActions.filter((a) => a.status === "open").length} open`}>
          Regulatory actions
        </SectionLabel>
        <ul className="divide-y divide-white/5">
          {regulatoryActions.map((action) => (
            <li key={action.id} className="py-2 first:pt-0 last:pb-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  {action.agency}
                </span>
                <span className="font-mono text-[10px] text-white/70">{action.reference}</span>
                <Pill tone={action.status === "open" ? "warn" : "neutral"}>{action.status}</Pill>
                <span className="font-mono text-[10px] tabular-nums text-white/30">{action.opened}</span>
              </div>
              <div className="text-xs font-medium text-white/85">{action.title}</div>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">{action.scope}</p>
              <a
                href={action.source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block text-[10px] text-white/30 underline decoration-white/15 underline-offset-2 hover:text-white/60"
              >
                {action.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
