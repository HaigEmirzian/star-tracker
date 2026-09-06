import {
  cumulativeMiles,
  cumulativeUnsupervisedMiles,
  cybercab,
  cybercabFleetCount,
  deferredRevenue,
  fsdAttachRate,
  fsdBuildVersion,
  fsdCumulativeMiles,
  fsdSubscriptions,
  notDisclosed,
  observedUnsupervisedVehicles,
  quarterlyPaidMiles,
  regulatoryActions,
  robotaxiCities,
  robotaxiLastUpdated,
  servicesAndOtherRevenue,
  texasFleetCount,
  texasFleetObservations,
  trainingCompute,
} from "@/lib/data/robotaxiStatic";
import type { CitedFigure } from "@/lib/data/gpuSpecs";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxiTypes";
import type { RobotaxiNewsData } from "@/lib/data/robotaxiNewsTypes";
import { collectFootnotes } from "@/lib/citations";
import { compact, num, usd, Card, Metric, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";
import RobotaxiCityTable from "@/components/tabs/tesla/RobotaxiCityTable";
import RobotaxiFleetChart from "@/components/tabs/tesla/RobotaxiFleetChart";
import RobotaxiIncidentTable from "@/components/tabs/tesla/RobotaxiIncidentTable";
import RobotaxiMilesChart from "@/components/tabs/tesla/RobotaxiMilesChart";
import RobotaxiNewsFeed from "@/components/tabs/tesla/RobotaxiNewsFeed";
import RobotaxiRevenueModel from "@/components/tabs/tesla/RobotaxiRevenueModel";
import RobotaxiSafetyPanel from "@/components/tabs/tesla/RobotaxiSafetyPanel";

export interface RobotaxiPanelProps {
  incidents: RobotaxiIncidentData | null;
  news: RobotaxiNewsData | null;
}

// Every figure in the KPI strip below is something Tesla or a regulator
// actually stated. Modelled numbers live only in RobotaxiRevenueModel, in
// their own visual register — see lib/citations.ts for where that line sits.
export default function RobotaxiPanel({ incidents, news }: RobotaxiPanelProps) {
  const driverlessCities = robotaxiCities.filter((c) => c.status === "driverless").length;
  const unsupervisedShare = Math.round(
    (cumulativeUnsupervisedMiles.value / cumulativeMiles.value) * 100,
  );

  // Arithmetic over two disclosed figures is a normal metric; both sources
  // stay in the footnotes below.
  const latestQuarter = quarterlyPaidMiles[quarterlyPaidMiles.length - 1];

  const citedFigures: CitedFigure<unknown>[] = [
    ...robotaxiCities.flatMap((c) => (c.launchDate ? [c.launchDate] : [])),
    ...texasFleetObservations.map((o) => o.total),
    ...quarterlyPaidMiles.map((q) => q.paidMiles),
    cumulativeMiles,
    cumulativeUnsupervisedMiles,
    cybercabFleetCount,
    observedUnsupervisedVehicles,
    cybercab.productionStart,
    cybercab.installedAnnualCapacity,
    cybercab.publicLaunch,
    cybercab.configuration,
    fsdBuildVersion,
    fsdSubscriptions,
    fsdAttachRate,
    fsdCumulativeMiles,
    servicesAndOtherRevenue,
    deferredRevenue,
    trainingCompute.cortex1Mw,
    trainingCompute.cortex2Mw,
  ];
  const footnotes = collectFootnotes(citedFigures);

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Robotaxi</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Tesla&rsquo;s driverless ride-hailing rollout — deployment, mileage, safety reporting and
            regulatory posture. Live NHTSA crash data and a rolling news scan; everything else is
            hand-maintained from Tesla filings and cited reporting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-white/35">
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
            FSD {fsdBuildVersion.value}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
            {driverlessCities} driverless metros
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
            Static data {robotaxiLastUpdated}
          </span>
        </div>
      </div>

      {/* KPI strip — disclosed figures only */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Metric
          label="Unsupervised miles"
          value={compact(cumulativeUnsupervisedMiles.value)}
          sub={cumulativeUnsupervisedMiles.note}
        />
        <Metric
          label="Cumulative paid miles"
          value={compact(cumulativeMiles.value)}
          sub={`${unsupervisedShare}% of paid miles now run unsupervised.`}
        />
        <Metric
          label={`Paid miles · ${latestQuarter.quarter}`}
          value={compact(latestQuarter.paidMiles.value)}
          sub={latestQuarter.paidMiles.note}
        />
        <Metric
          label="TX registered fleet"
          value={num(texasFleetCount.value)}
          sub={texasFleetCount.note}
        />
        <Metric
          label="Cybercabs registered"
          value={num(cybercabFleetCount.value)}
          sub={cybercabFleetCount.note}
        />
        <Metric
          label="Cybercab capacity"
          value={`${compact(cybercab.installedAnnualCapacity.value)}/yr`}
          sub={cybercab.installedAnnualCapacity.note}
        />
        <Metric
          label="Observed unsupervised"
          value={`~${num(observedUnsupervisedVehicles.value)}`}
          sub={observedUnsupervisedVehicles.note}
          accent="muted"
        />
        <Metric label="FSD subscriptions" value={compact(fsdSubscriptions.value)} sub={fsdSubscriptions.note} />
        <Metric label="FSD attach rate" value={`>${fsdAttachRate.value}%`} sub={fsdAttachRate.note} />
        <Metric
          label="Cumulative FSD miles"
          value={compact(fsdCumulativeMiles.value)}
          sub={fsdCumulativeMiles.note}
        />
        <Metric
          label="Services & Other rev."
          value={usd(servicesAndOtherRevenue.value)}
          sub={servicesAndOtherRevenue.note}
        />
        <Metric
          label="Training compute"
          value={`${trainingCompute.cortex1Mw.value + trainingCompute.cortex2Mw.value} MW`}
          sub={`Cortex 1 (${trainingCompute.cortex1Mw.value} MW) + Cortex 2 (${trainingCompute.cortex2Mw.value} MW), both in production.`}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        {/* min-w-0 on both columns: grid children default to min-width:auto,
            which lets a wide table or a measured chart SVG push the page. */}
        <div className="flex min-w-0 flex-col gap-3 xl:col-span-7">
          <RobotaxiCityTable />
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            <RobotaxiMilesChart />
            <RobotaxiFleetChart />
          </div>
          <RobotaxiRevenueModel />
          <RobotaxiIncidentTable incidents={incidents} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:col-span-5">
          <RobotaxiNewsFeed news={news} />
          <RobotaxiSafetyPanel incidents={incidents} />

          <Card>
            <SectionLabel>Not disclosed</SectionLabel>
            <p className="mb-2 text-[11px] leading-snug text-white/40">
              Tesla publishes none of the following and no credible third party measures them. They are
              listed rather than estimated.
            </p>
            <ul className="flex flex-col gap-1.5 text-[11px] leading-snug text-white/45">
              {notDisclosed.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-white/20">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-snug text-white/25">
              Deferred revenue of {usd(deferredRevenue.value)} bundles FSD with connectivity, Supercharging
              and OTA updates, so it cannot be read as an FSD backlog either.
            </p>
          </Card>
        </div>
      </div>

      {/* Sources */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35">Sources</div>
        <ul className="flex flex-col gap-1 text-[10px] text-white/25 sm:columns-2 lg:columns-3">
          {footnotes.map((f) => (
            <li key={f.source} className="break-inside-avoid">
              <a
                href={f.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/15 underline-offset-2 hover:text-white/55"
              >
                {f.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-white/25">
          Live sources: NHTSA Standing General Order 2021-01 (ADS incident reports) and publisher RSS
          feeds for the news scan. {regulatoryActions.length} regulatory actions tracked. Static figures
          last checked {robotaxiLastUpdated}.
        </p>
      </div>
    </div>
  );
}
