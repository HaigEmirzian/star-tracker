"use client";

import { useState } from "react";
import Image from "next/image";
import TabSwitcher from "@/components/TabSwitcher";
import TeslaTabSwitcher from "@/components/TeslaTabSwitcher";
import Starfield from "@/components/Starfield";
import TeslaBackdrop from "@/components/TeslaBackdrop";
import type { StarlinkPanelProps } from "@/components/tabs/StarlinkPanel";
import type { RobotaxiPanelProps } from "@/components/tabs/tesla/RobotaxiPanel";

type Site = "spacex" | "tesla";

export interface SiteSwitcherProps {
  starlinkData: StarlinkPanelProps;
  // Bundled the same way `starlinkData` is, so adding another live Tesla
  // source stays a one-file diff rather than a four-file prop-drill.
  robotaxiData: RobotaxiPanelProps;
}

export default function SiteSwitcher({ starlinkData, robotaxiData }: SiteSwitcherProps) {
  const [site, setSite] = useState<Site>("spacex");

  const siteToggle = (
            <div role="group" aria-label="Site" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm">
              <button
                type="button"
                aria-pressed={site === "spacex"}
                aria-label="SpaceX"
                onClick={() => setSite("spacex")}
                className={`relative h-9 w-16 shrink-0 overflow-hidden rounded-full bg-white p-2 transition-opacity ${
                  site === "spacex" ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image src="/images/logos/spacex.png" alt="SpaceX" fill sizes="64px" className="object-contain p-1" />
              </button>
              <button
                type="button"
                aria-pressed={site === "tesla"}
                aria-label="Tesla"
                onClick={() => setSite("tesla")}
                className={`relative h-9 w-16 shrink-0 overflow-hidden rounded-full bg-white p-2 transition-opacity ${
                  site === "tesla" ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image src="/images/logos/tesla.png" alt="Tesla" fill sizes="64px" className="object-contain p-1" />
              </button>
            </div>
  );

  return (
    <>
      {site === "spacex" ? <Starfield /> : <TeslaBackdrop />}

      <div className="relative w-full">


        {site === "spacex" ? (
          <TabSwitcher starlinkData={starlinkData} siteToggle={siteToggle} />
        ) : (
          <TeslaTabSwitcher robotaxiData={robotaxiData} siteToggle={siteToggle} />
        )}
      </div>

      {site === "spacex" && (
        <footer className="px-6 pb-8 text-center text-xs text-white/30">
          Data from CelesTrak &amp; Launch Library 2.
        </footer>
      )}
    </>
  );
}
