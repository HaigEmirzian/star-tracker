import { robotaxiCities, type RobotaxiCityStatus } from "@/lib/data/robotaxiStatic";
import { Pill, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

const STATUS: Record<
  RobotaxiCityStatus["status"],
  { label: string; tone: "good" | "warn" | "info" | "neutral" }
> = {
  driverless: { label: "Driverless", tone: "good" },
  "safety-driver": { label: "Safety driver", tone: "warn" },
  permitted: { label: "Permitted", tone: "info" },
  announced: { label: "Announced", tone: "neutral" },
};

const ORDER: RobotaxiCityStatus["status"][] = ["driverless", "safety-driver", "permitted", "announced"];

export default function RobotaxiCityTable() {
  const rows = [...robotaxiCities].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
  );
  const driverless = rows.filter((c) => c.status === "driverless").length;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <SectionLabel right={`${driverless} driverless of ${rows.length}`}>Cities</SectionLabel>
      {/* Wide content scrolls inside its own container rather than the page. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/35">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Metro
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Status
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Launched
              </th>
              <th scope="col" className="py-1.5 font-medium">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((city) => {
              const status = STATUS[city.status];
              return (
                <tr key={city.id} className="align-top transition-colors hover:bg-white/[0.03]">
                  <td className="py-2 pr-3">
                    <div className="text-xs font-medium text-white">{city.city}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/30">{city.state}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </td>
                  <td className="py-2 pr-3">
                    {city.launchDate ? (
                      <a
                        href={city.launchDate.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] tabular-nums text-white/70 underline decoration-white/15 underline-offset-2 hover:text-white"
                      >
                        {city.launchDate.value}
                      </a>
                    ) : (
                      <span className="font-mono text-[11px] text-white/25">—</span>
                    )}
                  </td>
                  <td className="py-2 text-[11px] leading-snug text-white/45">{city.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
