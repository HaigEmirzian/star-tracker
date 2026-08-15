import Starfield from "@/components/Starfield";
import TabSwitcher from "@/components/TabSwitcher";
import { getStarlinkSummary } from "@/lib/data/celestrak";
import {
  getRecentStarlinkLaunches,
  getUpcomingStarlinkLaunches,
} from "@/lib/data/launchLibrary";

export default async function Home() {
  const [summary, upcomingLaunches, recentLaunches] = await Promise.all([
    getStarlinkSummary(),
    getUpcomingStarlinkLaunches(),
    getRecentStarlinkLaunches(),
  ]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Starfield />
      <main className="flex flex-1 flex-col px-6 py-16 sm:px-12">
        <TabSwitcher
          starlinkData={{ summary, upcomingLaunches, recentLaunches }}
        />
      </main>
      <footer className="px-6 pb-8 text-center text-xs text-white/30">
        Data from CelesTrak &amp; Launch Library 2. Not affiliated with SpaceX.
      </footer>
    </div>
  );
}
