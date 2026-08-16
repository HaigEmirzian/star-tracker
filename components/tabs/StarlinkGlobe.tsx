"use client";

import { useEffect, useRef, useState } from "react";
import type { StarlinkGpEntry } from "@/lib/data/celestrak";

// Real satellites plotted from real orbital elements — positions are
// computed with the same SGP4 propagation algorithm every serious tracker
// (N2YO, CelesTrak) uses, not simulated. Refreshed on an interval rather
// than every frame: at LEO speeds a satellite moves only a small fraction
// of its orbit in a few seconds, so this still reads as live motion
// without re-propagating ~8,700 satellites 60 times a second.
const POSITION_REFRESH_MS = 4000;
const EARTH_RADIUS_KM = 6371;

interface GlobePoint {
  name: string;
  lat: number;
  lng: number;
  altitude: number; // globe.gl units: fraction of globe radius above surface
}

export default function StarlinkGlobe({ entries }: { entries: StarlinkGpEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || entries.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let globeInstance: import("globe.gl").GlobeInstance | undefined;

    async function init() {
      const [{ default: Globe }, satellite] = await Promise.all([
        import("globe.gl"),
        import("satellite.js"),
      ]);
      if (disposed || !containerRef.current) return;

      const satrecs = entries
        .map((entry) => {
          try {
            return { name: entry.OBJECT_NAME, satrec: satellite.json2satrec(entry) };
          } catch {
            return null;
          }
        })
        .filter((s): s is { name: string; satrec: ReturnType<typeof satellite.json2satrec> } => s !== null);

      if (satrecs.length === 0) {
        setError("Unable to compute satellite positions from current orbital data.");
        return;
      }

      function computePositions(): GlobePoint[] {
        const now = new Date();
        const gmst = satellite.gstime(now);
        const points: GlobePoint[] = [];
        for (const { name, satrec } of satrecs) {
          const result = satellite.propagate(satrec, now);
          if (!result || !result.position) continue;
          const geodetic = satellite.eciToGeodetic(result.position, gmst);
          points.push({
            name,
            lat: satellite.degreesLat(geodetic.latitude),
            lng: satellite.degreesLong(geodetic.longitude),
            altitude: geodetic.height / EARTH_RADIUS_KM,
          });
        }
        return points;
      }

      // particlesData (not pointsData) — pointsData renders bar/pin shapes
      // anchored to the surface (a bar-chart-on-a-globe primitive); a
      // satellite is a free-floating dot at altitude, which is what the
      // particles layer is built for.
      globeInstance = new Globe(containerRef.current!)
        .globeImageUrl("/textures/earth-dark.jpg")
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#3987e5")
        .atmosphereAltitude(0.15)
        .particlesData([computePositions()])
        .particlesList((d) => d as object[])
        .particleLat("lat")
        .particleLng("lng")
        .particleAltitude("altitude")
        .particlesSize(1.4)
        .particlesSizeAttenuation(true)
        .particlesColor(() => "#3987e5")
        .particleLabel("name")
        .width(containerRef.current!.clientWidth)
        .height(containerRef.current!.clientHeight);

      globeInstance.controls().autoRotate = !reduceMotion;
      globeInstance.controls().autoRotateSpeed = 0.4;

      intervalId = setInterval(() => {
        globeInstance?.particlesData([computePositions()]);
      }, POSITION_REFRESH_MS);
    }

    init().catch(() => {
      if (!disposed) setError("Unable to load the 3D globe.");
    });

    function onResize() {
      if (!globeInstance || !containerRef.current) return;
      globeInstance
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("resize", onResize);
      globeInstance?._destructor();
    };
  }, [entries]);

  if (error) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div ref={containerRef} className="h-[420px] w-full" />
    </div>
  );
}
