"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RobotaxiMap.module.css";
import { robotaxiCities, type RobotaxiCityStatus } from "@/lib/data/robotaxiStatic";
import {
  CITY_POSITIONS,
  US_MAP_VIEWBOX,
  US_NATION_PATH,
  US_STATE_BORDERS_PATH,
} from "@/lib/data/usMapGeometry";

// The deployment map: where Tesla actually runs robotaxis, and under what
// terms. This is the Tesla side's counterpart to the Starlink globe — the one
// thing worth looking at before any number.
//
// Geometry is a real Albers USA projection baked to static SVG paths at build
// time (see lib/data/usMapGeometry.ts), so there is no map library, no
// basemap request, and nothing that can fail to load. Markers are positioned
// from each city's real latitude/longitude through that same projection.
//
// Status drives the marker, and the marker is never colour alone: a permitted
// city is a hollow ring, an announced one a dashed ring, so the four states
// stay distinguishable without relying on hue.

const STATUS_STYLE: Record<
  RobotaxiCityStatus["status"],
  { fill: string; ring: string; dash?: string; glow?: string; label: string }
> = {
  // Categorical slots 1 and 2, validated against this panel's #08090c backdrop.
  driverless: { fill: "#3987e5", ring: "#3987e5", glow: "url(#rtGlowLive)", label: "Driverless" },
  "safety-driver": { fill: "#d95926", ring: "#d95926", glow: "url(#rtGlowSd)", label: "Safety driver" },
  permitted: { fill: "none", ring: "#7dd3fc", label: "Permitted, not open" },
  announced: { fill: "none", ring: "rgba(255,255,255,0.45)", dash: "2 2", label: "Announced" },
};

// Marker radius by status — driverless cities get a presence proportional to
// how established they are, but nothing here encodes a vehicle count: Tesla
// discloses no per-city fleet split, so sizing by one would be inventing data.
const RADIUS: Record<RobotaxiCityStatus["status"], number> = {
  driverless: 5.5,
  "safety-driver": 5,
  permitted: 4.5,
  announced: 4.5,
};

const GLOW_RADIUS: Record<string, number> = {
  austin: 60,
  dallas: 34,
  houston: 30,
  miami: 26,
  orlando: 22,
  tampa: 22,
  "bay-area": 26,
};

// Hand-placed label offsets — the metros cluster tightly in Texas and Florida,
// so an automatic placement collides. dx/dy are in viewBox units.
const LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end"; sub?: string }> = {
  austin: { dx: 0, dy: 27, anchor: "middle", sub: "Cybercab live" },
  dallas: { dx: 0, dy: -12, anchor: "middle" },
  houston: { dx: 12, dy: 4, anchor: "start" },
  miami: { dx: 11, dy: 4, anchor: "start" },
  orlando: { dx: 11, dy: -5, anchor: "start" },
  tampa: { dx: -11, dy: 17, anchor: "end" },
  "bay-area": { dx: 13, dy: -4, anchor: "start", sub: "safety driver" },
  "las-vegas": { dx: 12, dy: -3, anchor: "start", sub: "10-vehicle cap" },
  phoenix: { dx: 12, dy: 4, anchor: "start" },
};

export default function RobotaxiMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  function selectCity(id: string | null) {
    setSelectedId(id);
    setScale(id ? 1.65 : 1);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      setScale((current) => Math.min(3, Math.max(1, current * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003))));
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const placed = robotaxiCities
    .map((city) => ({ city, pos: CITY_POSITIONS[city.id] }))
    .filter((e): e is { city: RobotaxiCityStatus; pos: readonly [number, number] } => Boolean(e.pos));

  const driverless = placed.filter((p) => p.city.status === "driverless").length;

  const selected = placed.find(({ city }) => city.id === selectedId);
  const focusWeight = Math.min(1, (scale - 1) / 0.65);
  const centerX = US_MAP_VIEWBOX.width / 2;
  const centerY = US_MAP_VIEWBOX.height / 2;
  const focusX = centerX + ((selected?.pos[0] ?? centerX) - centerX) * focusWeight;
  const focusY = centerY + ((selected?.pos[1] ?? centerY) - centerY) * focusWeight;
  const tx = centerX - focusX * scale;
  const ty = centerY - focusY * scale;

  return (
    <div onKeyDown={(event) => { if (event.key === "Escape") selectCity(null); }} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-white/80">
          Where robotaxis operate
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-white/25">
          {driverless} driverless of {placed.length} metros
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="robotaxi-map-city" className="sr-only">Explore a city</label>
        <select
          id="robotaxi-map-city"
          value={selectedId ?? ""}
          onChange={(event) => selectCity(event.target.value || null)}
          className="min-w-0 max-w-full rounded-lg border border-white/15 bg-[#101318] px-3 py-2 text-sm text-white/80 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <option value="">Explore a city</option>
          {placed.map(({ city }) => <option key={city.id} value={city.id}>{city.city}</option>)}
        </select>
        <button type="button" onClick={() => selectCity(null)} disabled={!selected && scale === 1}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-35">
          Reset view
        </button>
      </div>

      {/* Capped height so the map sets the scene without eating the fold — the
          charts below should be visible on a normal laptop screen. The aspect
          ratio is preserved; it just stops growing on very wide viewports. */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${US_MAP_VIEWBOX.width} ${US_MAP_VIEWBOX.height}`}
        className="mx-auto block h-[clamp(220px,calc(100svh-360px),360px)] w-full"
        role="group"
        aria-label={`Map of the United States showing ${driverless} metros with driverless Tesla robotaxi service, plus cities under a safety-driver requirement, permitted but not open, and announced only.`}
      >
        <defs>
          <radialGradient id="rtGlowLive" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3987e5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3987e5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rtGlowSd" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d95926" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d95926" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className={styles.viewport} style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        <path d={US_NATION_PATH} fill="#101318" stroke="#354353" strokeWidth={1.1} />
        <path d={US_STATE_BORDERS_PATH} fill="none" stroke="#283340" strokeWidth={0.7} />

        {/* Glows first, so every marker sits above every halo. */}
        {placed.map(({ city, pos }) => {
          const style = STATUS_STYLE[city.status];
          const r = GLOW_RADIUS[city.id];
          if (!style.glow || !r) return null;
          return <circle key={`${city.id}-glow`} cx={pos[0]} cy={pos[1]} r={r} fill={style.glow} />;
        })}

        {placed.map(({ city, pos }) => {
          const style = STATUS_STYLE[city.status];
          const label = LABEL[city.id] ?? { dx: 11, dy: 4, anchor: "start" as const };
          const dim = city.status === "announced";
          return (
            <g key={city.id}
              role="button"
              tabIndex={0}
              aria-label={city.city + ": " + style.label}
              aria-pressed={selectedId === city.id}
              className={styles.marker}
              onClick={() => selectCity(city.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectCity(city.id);
                }
              }}
            >
              <circle cx={pos[0]} cy={pos[1]} r={18} fill="transparent" />
              <circle className={styles.focusRing} cx={pos[0]} cy={pos[1]} r={12} fill="none" stroke="white" strokeWidth={1.5} />
              {(city.status === "driverless" || city.status === "safety-driver") && (
                <circle className={styles.pulse} cx={pos[0]} cy={pos[1]} r={9} fill="none" stroke={style.ring} strokeWidth={1.2} />
              )}
              {selectedId === city.id && <circle cx={pos[0]} cy={pos[1]} r={12} fill="none" stroke="white" strokeWidth={1.5} />}
              <circle
                cx={pos[0]}
                cy={pos[1]}
                r={RADIUS[city.status]}
                fill={style.fill}
                stroke={style.fill === "none" ? style.ring : "#08090c"}
                strokeWidth={style.fill === "none" ? 1.5 : 2}
                strokeDasharray={style.dash}
              />
              <text
                x={pos[0] + label.dx}
                y={pos[1] + label.dy}
                textAnchor={label.anchor}
                fontSize={12.5}
                fill={dim ? "rgba(255,255,255,0.45)" : "#fff"}
                className="font-mono"
              >
                {city.city}
              </text>
              {label.sub && (
                <text
                  x={pos[0] + label.dx}
                  y={pos[1] + label.dy + 13}
                  textAnchor={label.anchor}
                  fontSize={10.5}
                  fill="rgba(255,255,255,0.40)"
                  className="font-mono"
                >
                  {label.sub}
                </text>
              )}
            </g>
          );
        })}
        </g>
      </svg>

      <div className={selected ? "mb-3 rounded-lg border border-white/10 bg-black/20 p-3" : "mb-3"} aria-live="polite" aria-atomic="true">
        {selected ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">{selected.city.city}, {selected.city.state}</h3>
              <span className="text-sm text-sky-300">{STATUS_STYLE[selected.city.status].label}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
              <span>{selected.city.launchDate
                ? (selected.city.status === "permitted" ? "Permitted " : "Launched ") + selected.city.launchDate.value
                : "Launch date unconfirmed"}</span>
              {selected.city.launchDate && (
                <a href={selected.city.launchDate.source} target="_blank" rel="noopener noreferrer"
                  className="underline decoration-white/25 underline-offset-4 hover:text-white">
                  {selected.city.launchDate.sourceLabel}
                </a>
              )}
            </div>
          </>
        ) : <p className="text-sm text-white/50">Select a city to explore service status and launch details.</p>}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
        {(Object.keys(STATUS_STYLE) as RobotaxiCityStatus["status"][]).map((status) => {
          const style = STATUS_STYLE[status];
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={
                  style.fill === "none"
                    ? { border: `1.5px ${style.dash ? "dashed" : "solid"} ${style.ring}` }
                    : { background: style.fill }
                }
              />
              {style.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
