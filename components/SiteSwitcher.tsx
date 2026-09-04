"use client";

import { useState } from "react";
import Image from "next/image";
import TabSwitcher from "@/components/TabSwitcher";
import TeslaTabSwitcher from "@/components/TeslaTabSwitcher";
import Starfield from "@/components/Starfield";
import TeslaBackdrop from "@/components/TeslaBackdrop";
import type { StarlinkPanelProps } from "@/components/tabs/StarlinkPanel";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxi";
import { futureFeaturesEnabled } from "@/lib/flags";

type Site = "spacex" | "tesla";

export interface SiteSwitcherProps {
  starlinkData: StarlinkPanelProps;
  robotaxiIncidents: RobotaxiIncidentData | null;
}

export default function SiteSwitcher({ starlinkData, robotaxiIncidents }: SiteSwitcherProps) {
  const [site, setSite] = useState<Site>("spacex");

  // The Tesla side is gated behind `futureFeaturesEnabled` — when it's off, the
  // site toggle is hidden entirely and only the SpaceX tracker renders.
  const activeSite: Site = futureFeaturesEnabled ? site : "spacex";

  return (
    <>
      {activeSite === "spacex" ? <Starfield /> : <TeslaBackdrop />}

      <div className="relative w-full">
        {/* In normal flow (not absolute) so it can never overlap — and steal
            clicks from — TabSwitcher's/TeslaTabSwitcher's own z-10 tab bar
            below it, whatever the viewport width. */}
        {futureFeaturesEnabled && (
          <div className="mb-4 flex justify-end">
            <div role="group" aria-label="Site" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm">
              <button
                type="button"
                aria-pressed={activeSite === "spacex"}
                aria-label="SpaceX"
                onClick={() => setSite("spacex")}
                className={`relative h-9 w-16 shrink-0 overflow-hidden rounded-full bg-white p-2 transition-opacity ${
                  activeSite === "spacex" ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image src="/images/logos/spacex.png" alt="SpaceX" fill className="object-contain p-1" />
              </button>
              <button
                type="button"
                aria-pressed={activeSite === "tesla"}
                aria-label="Tesla"
                onClick={() => setSite("tesla")}
                className={`relative h-9 w-16 shrink-0 overflow-hidden rounded-full bg-white p-2 transition-opacity ${
                  activeSite === "tesla" ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image src="/images/logos/tesla.png" alt="Tesla" fill className="object-contain p-1" />
              </button>
            </div>
          </div>
        )}

        {activeSite === "spacex" ? (
          <TabSwitcher starlinkData={starlinkData} />
        ) : (
          <TeslaTabSwitcher incidents={robotaxiIncidents} />
        )}
      </div>

      {activeSite === "spacex" && (
        <footer className="px-6 pb-8 text-center text-xs text-white/30">
          Data from CelesTrak &amp; Launch Library 2. Not affiliated with SpaceX.
        </footer>
      )}
    </>
  );
}
