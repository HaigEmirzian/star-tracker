import type { ReactNode } from "react";
import Image from "next/image";
import { starmind } from "@/lib/data/starmindStatic";
import type { CitedFigure } from "@/lib/data/gpuSpecs";
import GpuSpecComparison from "@/components/tabs/GpuSpecComparison";
import CapabilityTranslator from "@/components/tabs/CapabilityTranslator";

function LockedStat({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-sm uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-2 text-4xl font-semibold text-white/20">—</div>
      <div className="mt-1 text-sm text-white/30">Pending first deployment</div>
    </div>
  );
}

// Program-details fact card: label/value pairs, same shell as the existing
// Prototype/FCC filing cards. `dd` accepts either a plain string (old
// uncited fields) or a formatted CitedFigure value.
function FactCard({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-3 text-sm uppercase tracking-wide text-white/50">{title}</div>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-white/40">{row.label}</dt>
            <dd className="text-right text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const numberFmt = (v: number) => v.toLocaleString();

function collectFootnotes(figures: CitedFigure<unknown>[]) {
  const seen = new Map<string, { label: string; source: string }>();
  for (const fig of figures) {
    seen.set(fig.source, { label: fig.sourceLabel, source: fig.source });
  }
  return Array.from(seen.values());
}

export default function StarmindPanel() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-white/60">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        {starmind.status.replace("_", " ")}
      </div>

      <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        Starmind
      </h1>
      <p className="max-w-xl text-balance text-lg text-white/60">
        {starmind.description}
      </p>

      <figure className="w-full">
        <div className="relative aspect-[2/1] max-h-[40dvh] w-full overflow-hidden rounded-2xl border border-white/10">
          <Image
            src="/images/starmind/ai1-satellite-render.jpg"
            alt={`Render of SpaceX's ${starmind.prototype.name} Starmind satellite in orbit`}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 768px, 100vw"
            priority
          />
        </div>
        <figcaption className="mt-2 text-xs text-white/30">
          {starmind.prototype.name} satellite render, via Nvidia/SpaceXAI —{" "}
          <a
            href="https://x.com/SawyerMerritt/status/2091911938947035434"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 hover:text-white/50"
          >
            source
          </a>
        </figcaption>
      </figure>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <LockedStat label="Satellites deployed" />
        <LockedStat label="Power capacity in orbit" />
        <LockedStat label="Compute capacity" />
      </div>

      <div className="flex w-full flex-col gap-4 text-left">
        <div className="text-sm uppercase tracking-wide text-white/50">
          Program details
        </div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <FactCard
            title={`Prototype: ${starmind.prototype.name}`}
            rows={[
              { label: "Target launch", value: starmind.prototype.targetLaunch },
              { label: "Mass production", value: starmind.prototype.massProductionStart },
              {
                label: "Per Starship launch",
                value: `${starmind.prototype.satellitesPerStarshipMission} satellites`,
              },
              {
                label: "Compute hardware",
                value: `${starmind.hardware.gpu} + ${starmind.hardware.cpu}`,
              },
            ]}
          />

          <FactCard
            title="FCC filing"
            rows={[
              { label: "Filed", value: starmind.fccFiling.filedDate },
              {
                label: "Requested satellites",
                value: starmind.fccFiling.requestedSatellites.toLocaleString(),
              },
              {
                label: "Altitude range",
                value: `${starmind.fccFiling.altitudeRangeKm[0]}-${starmind.fccFiling.altitudeRangeKm[1]} km`,
              },
              { label: "Inclinations", value: starmind.fccFiling.inclinations },
            ]}
          />

          <FactCard
            title="Gigasat Factory"
            rows={[
              { label: "Location", value: starmind.factory.location },
              {
                label: "Size",
                value: `${numberFmt(starmind.factory.sizeSqFt.value)} sq ft`,
              },
              {
                label: "Compute target",
                value: `${starmind.factory.computeTargetGwPerYear.value} GW/yr by ${starmind.factory.targetYear}`,
              },
            ]}
          />

          <FactCard
            title={`${starmind.prototype.name} satellite specs`}
            rows={[
              {
                label: "Dimensions",
                value: `${starmind.satelliteSpecs.heightM.value}m × ${starmind.satelliteSpecs.wingspanM.value}m span`,
              },
              {
                label: "Orbit",
                value: `${numberFmt(starmind.satelliteSpecs.orbitAltitudeKm.value)} km, sun-synchronous`,
              },
              {
                label: "Power (avg / peak)",
                value: `${starmind.satelliteSpecs.avgPowerKw.value} / ${starmind.satelliteSpecs.peakPowerKw.value} kW`,
              },
              {
                label: "Solar array",
                value: `${starmind.satelliteSpecs.solarArrayKw.value} kW`,
              },
              {
                label: "Radiator area",
                value: `${starmind.satelliteSpecs.radiatorAreaM2.value} m²`,
              },
              {
                label: "Per-satellite hardware",
                value: `${starmind.perSatelliteHardware.rubinGpuCount.value} Rubin + ${starmind.perSatelliteHardware.veraCpuCount.value} Vera`,
              },
            ]}
          />
        </div>

        <ul className="flex flex-col gap-1 text-xs text-white/30">
          {collectFootnotes([
            starmind.factory.sizeSqFt,
            starmind.factory.computeTargetGwPerYear,
            starmind.satelliteSpecs.heightM,
            starmind.satelliteSpecs.wingspanM,
            starmind.satelliteSpecs.orbitAltitudeKm,
            starmind.satelliteSpecs.avgPowerKw,
            starmind.satelliteSpecs.peakPowerKw,
            starmind.satelliteSpecs.solarArrayKw,
            starmind.satelliteSpecs.radiatorAreaM2,
            starmind.perSatelliteHardware.rubinGpuCount,
            starmind.perSatelliteHardware.veraCpuCount,
          ]).map((fn) => (
            <li key={fn.source}>
              <a
                href={fn.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/20 hover:text-white/50"
              >
                {fn.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <GpuSpecComparison />

      <div className="w-full">
        <CapabilityTranslator />
      </div>

      <p className="text-xs text-white/30">
        Partnership with {starmind.partner} announced {starmind.partnershipAnnounced} ·
        Program confirmed {starmind.confirmedDate} · Data last updated{" "}
        {starmind.lastUpdated}
      </p>
    </div>
  );
}
