"use client";

import { useEffect, useState } from "react";
import { fsdMilesAnchor } from "@/lib/data/robotaxiStatic";

// A ticking cumulative-FSD-miles odometer, in the spirit of the one Tesla runs
// on its own FSD page.
//
// HONESTY CONTRACT — this is the only number on the panel that moves on its
// own, and it is a PROJECTION, not a measurement:
//   - the anchor (12B miles at Q2 2026 close) is disclosed,
//   - the rate (20.4M miles/day) is disclosed,
//   - the value between them is ours, and the card says so on screen.
// Never relabel this "live", never feed it into another metric, and never
// write a projected value back into robotaxiStatic.ts as a fact.
//
// Hydration: the count depends on Date.now(), so it renders as a placeholder
// until after mount. The server would otherwise bake its own clock into the
// HTML and mismatch the client (see lib/hooks/useNow.ts for the general case;
// this component keeps its own interval because it ticks several times a
// second rather than once a minute).
const TICK_MS = 120;

const ANCHOR_AT = Date.parse(fsdMilesAnchor.asOfIso);

function projectedMiles(nowMs: number): number {
  const days = Math.max(0, (nowMs - ANCHOR_AT) / 86_400_000);
  return Math.floor(fsdMilesAnchor.miles.value + days * fsdMilesAnchor.milesPerDay.value);
}

export default function RobotaxiFsdCounter() {
  const [miles, setMiles] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMiles(projectedMiles(Date.now()));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
          Cumulative FSD miles
        </h2>
      </div>

      <div
        className="font-mono text-[32px] font-semibold leading-none tracking-tight tabular-nums text-white"
        // The value changes several times a second; announcing every tick would
        // flood a screen reader, so it is exposed as a static figure instead.
        aria-live="off"
      >
        {miles === null ? (
          <span className="text-white/25">{fsdMilesAnchor.miles.value.toLocaleString("en-US")}</span>
        ) : (
          miles.toLocaleString("en-US")
        )}
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-white/35">
        Projected forward from Tesla&rsquo;s last disclosed total at its stated rate of{" "}
        <span className="font-mono text-white/55">20.4M mi/day</span>. A projection, not a live feed
        &mdash; consumer FSD, separate from the robotaxi fleet&rsquo;s autonomous miles.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {[fsdMilesAnchor.miles, fsdMilesAnchor.milesPerDay].map((figure) => (
          <a
            key={figure.source}
            href={figure.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-white/25 underline decoration-white/15 underline-offset-2 hover:text-white/55"
          >
            {figure.sourceLabel}
          </a>
        ))}
      </div>
    </div>
  );
}
