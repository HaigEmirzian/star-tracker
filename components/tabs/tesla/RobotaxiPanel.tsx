import {
  cumulativeUnsupervisedMiles,
  cybercabFleetCount,
  quarterlyPaidMiles,
  regulatoryActions,
  robotaxiCities,
  texasFleetCount,
} from "@/lib/data/robotaxiStatic";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxiTypes";
import type { RobotaxiNewsData } from "@/lib/data/robotaxiNewsTypes";
import type { TxdmvFleetData } from "@/lib/data/txdmvFleetTypes";
import { compact, num, Metric } from "@/components/tabs/tesla/robotaxiUi";
import RobotaxiCityTable from "@/components/tabs/tesla/RobotaxiCityTable";
import RobotaxiFleetChart from "@/components/tabs/tesla/RobotaxiFleetChart";
import RobotaxiFsdChart from "@/components/tabs/tesla/RobotaxiFsdChart";
import RobotaxiFsdCounter from "@/components/tabs/tesla/RobotaxiFsdCounter";
import RobotaxiIncidentTable from "@/components/tabs/tesla/RobotaxiIncidentTable";
import RobotaxiMap from "@/components/tabs/tesla/RobotaxiMap";
import RobotaxiMilesChart from "@/components/tabs/tesla/RobotaxiMilesChart";
import RobotaxiNewsFeed from "@/components/tabs/tesla/RobotaxiNewsFeed";
import RobotaxiRevenueModel from "@/components/tabs/tesla/RobotaxiRevenueModel";
import RobotaxiSafetyPanel from "@/components/tabs/tesla/RobotaxiSafetyPanel";
import RobotaxiSection from "@/components/tabs/tesla/RobotaxiSection";

export interface RobotaxiPanelProps {
  incidents: RobotaxiIncidentData | null;
  news: RobotaxiNewsData | null;
  fleet: TxdmvFleetData | null;
}

// The panel opens on a map and six numbers, then folds everything else away.
// An earlier version landed twelve stat tiles and eight modules at once, which
// was more than anyone could read — the detail all survives, one disclosure
// away, and the sections carry counts so you can tell what is inside first.
//
// Every figure above the fold is one Tesla or a regulator actually stated.
// Two things on this page are NOT measurements and both say so where they
// render: the FSD odometer (a projection between quarterly disclosures) and
// the revenue model (derived from cited inputs). Neither may leak into a
// metric tile here.
export default function RobotaxiPanel({ incidents, news, fleet }: RobotaxiPanelProps) {
  const driverlessCities = robotaxiCities.filter((c) => c.status === "driverless").length;
  const latestQuarter = quarterlyPaidMiles[quarterlyPaidMiles.length - 1];

  // Prefer the live TxDMV registry over the hand-maintained snapshot; fall
  // back to the cited static figure when the feed is unavailable.
  const liveFleet = fleet?.tesla ?? null;
  const fleetTotal = liveFleet?.fleetSize ?? texasFleetCount.value;
  const cybercabs = liveFleet?.models?.Cybercab ?? cybercabFleetCount.value;
  const openActions = regulatoryActions.filter((a) => a.status === "open").length;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[34px] font-semibold leading-none tracking-tight text-white">
              Robotaxi
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              {driverlessCities} metros live
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/50">
            Tesla&rsquo;s driverless ride-hailing rollout, tracked from public filings. Fleet counts
            come live from the Texas DMV registry, crash reports from NHTSA, and headlines from a
            rolling news scan.
          </p>
        </div>
      </div>

      {/* ── Hero: the map, and the numbers worth leading with ── */}
      {/* Wider right rail than the map needs, which trims the map back a little
          and gives the counter and metrics room to breathe. */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <RobotaxiMap />

        <div className="flex min-w-0 flex-col gap-3">
          <RobotaxiFsdCounter />

          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Unsupervised mi"
              value={compact(cumulativeUnsupervisedMiles.value)}
              sub="+620K in the six weeks to 3 Sep."
            />
            <Metric
              label="TX fleet"
              value={num(fleetTotal)}
              sub={
                liveFleet
                  ? `+${num(liveFleet.change7d)} in 7 days. Registrations, not vehicles in service.`
                  : texasFleetCount.note
              }
            />
            <Metric
              label="Cybercabs"
              value={num(cybercabs)}
              sub="Public rides in Austin since 4 Sep 2026."
            />
            <Metric
              label={`Paid mi · ${latestQuarter.quarter}`}
              value={compact(latestQuarter.paidMiles.value)}
              sub="Down 36% QoQ — Tesla attributes it to Cybercab data collection."
            />
          </div>
        </div>
      </div>

      {/* ── Charts: what used to be a wall of text tiles ─────── */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RobotaxiFleetChart fleet={fleet} />
        <RobotaxiMilesChart />
        <RobotaxiFsdChart />
      </div>

      {/* ── Everything else, folded away ─────────────────────── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <RobotaxiSection
            id="cities"
            title="Cities & status"
            summary="Launch dates and the terms each metro operates under"
            count={`${driverlessCities} of ${robotaxiCities.length} driverless`}
            defaultOpen
          >
            <RobotaxiCityTable />
          </RobotaxiSection>

          <RobotaxiSection
            id="economics"
            title="Economics"
            summary="Estimated fares and costs"
            count="estimate"
          >
            <RobotaxiRevenueModel />
          </RobotaxiSection>


        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <RobotaxiSection
            id="news"
            title="News"
            summary="Rolling scan across Electrek, Teslarati and TechCrunch"
            count={news ? `${news.items.length} items` : "unavailable"}
            defaultOpen
          >
            <RobotaxiNewsFeed news={news} />
          </RobotaxiSection>

          <RobotaxiSection
            id="safety"
            title="Safety & regulation"
            summary="NHTSA incident reports, open investigations and permit caps"
            count={
              incidents
                ? `${incidents.summary.totalIncidents} reports · ${openActions} open`
                : `${openActions} open`
            }
          >
            <div className="flex flex-col gap-3">
              <RobotaxiSafetyPanel incidents={incidents} />
              <RobotaxiIncidentTable incidents={incidents} />
            </div>
          </RobotaxiSection>
        </div>
      </div>
    </div>
  );
}
