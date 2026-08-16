import { starmind } from "@/lib/data/starmindStatic";
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

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <LockedStat label="Satellites deployed" />
        <LockedStat label="Power capacity in orbit" />
        <LockedStat label="Compute capacity" />
      </div>

      <div className="grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
            Prototype: {starmind.prototype.name}
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/40">Target launch</dt>
              <dd className="text-white">{starmind.prototype.targetLaunch}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Mass production</dt>
              <dd className="text-white">{starmind.prototype.massProductionStart}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Per Starship launch</dt>
              <dd className="text-white">
                {starmind.prototype.satellitesPerStarshipMission} satellites
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Compute hardware</dt>
              <dd className="text-white">
                {starmind.hardware.gpu} + {starmind.hardware.cpu}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-3 text-sm uppercase tracking-wide text-white/50">
            FCC filing
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/40">Filed</dt>
              <dd className="text-white">{starmind.fccFiling.filedDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Requested satellites</dt>
              <dd className="text-white">
                {starmind.fccFiling.requestedSatellites.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Altitude range</dt>
              <dd className="text-white">
                {starmind.fccFiling.altitudeRangeKm[0]}-
                {starmind.fccFiling.altitudeRangeKm[1]} km
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/40">Inclinations</dt>
              <dd className="text-white">{starmind.fccFiling.inclinations}</dd>
            </div>
          </dl>
        </div>
      </div>

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
