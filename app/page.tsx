import SiteSwitcher from "@/components/SiteSwitcher";
import { getStarlinkData } from "@/lib/data/celestrak";
import {
  getRecentStarlinkLaunches,
  getUpcomingStarlinkLaunches,
} from "@/lib/data/launchLibrary";
import { getRobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxi";
import { getRobotaxiNews } from "@/lib/data/robotaxiNews";
import { getTxdmvFleetData } from "@/lib/data/txdmvFleet";
import { futureFeaturesEnabled } from "@/lib/flags";

export default async function Home() {
  const [
    starlinkData,
    upcomingLaunches,
    recentLaunches,
    robotaxiIncidents,
    robotaxiNews,
    robotaxiFleet,
  ] = await Promise.all([
    getStarlinkData(),
    getUpcomingStarlinkLaunches(),
    getRecentStarlinkLaunches(),
    // Tesla side is flag-gated — skip all three Tesla fetches when it's off.
    futureFeaturesEnabled ? getRobotaxiIncidentData() : Promise.resolve(null),
    futureFeaturesEnabled ? getRobotaxiNews() : Promise.resolve(null),
    futureFeaturesEnabled ? getTxdmvFleetData() : Promise.resolve(null),
  ]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col px-6 pt-8 pb-16 sm:px-12 sm:pt-10">
        <SiteSwitcher
          starlinkData={{
            summary: starlinkData?.summary ?? null,
            entries: starlinkData?.entries ?? [],
            upcomingLaunches,
            recentLaunches,
          }}
          robotaxiData={{
            incidents: robotaxiIncidents,
            news: robotaxiNews,
            fleet: robotaxiFleet,
          }}
        />
      </main>
    </div>
  );
}
