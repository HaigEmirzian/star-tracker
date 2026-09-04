import {
  robotaxiCities,
  notableSightings,
  cumulativeMiles,
  cumulativeUnsupervisedMiles,
  texasFleetCount,
  robotaxiLastUpdated,
  type RobotaxiCityStatus,
} from "@/lib/data/robotaxiStatic";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxi";

const numberFmt = (v: number) => v.toLocaleString();

function RollupStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      {note && <div className="mt-1 text-xs text-white/40">{note}</div>}
    </div>
  );
}

const STATUS_LABEL: Record<RobotaxiCityStatus["status"], string> = {
  driverless: "Driverless",
  "safety-driver": "Safety driver",
  announced: "Announced",
};

const STATUS_STYLE: Record<RobotaxiCityStatus["status"], string> = {
  driverless: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  "safety-driver": "border-amber-300/30 bg-amber-300/10 text-amber-200",
  announced: "border-white/20 bg-white/10 text-white/60",
};

function CityCard({ city }: { city: RobotaxiCityStatus }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{city.city}</div>
          <div className="text-xs uppercase tracking-wide text-white/40">{city.state}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${STATUS_STYLE[city.status]}`}>
          {STATUS_LABEL[city.status]}
        </span>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">Launched</dt>
          <dd className="text-right text-white">{city.launchDate?.value ?? "Not yet launched"}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-white/50">{city.notes}</p>
    </div>
  );
}

export default function RobotaxiPanel({
  incidents,
}: {
  incidents: RobotaxiIncidentData | null;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">Robotaxi</h1>
      <p className="max-w-xl text-balance text-lg text-white/60">
        Tesla&apos;s driverless ride-hailing rollout — tracked from Tesla&apos;s own quarterly
        disclosures, public reporting, and live NHTSA crash-reporting data. This isn&apos;t a
        real-time feed: city facts update by hand as news lands, refreshed{" "}
        {robotaxiLastUpdated}.
      </p>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RollupStat
          label="Cumulative autonomous miles"
          value={numberFmt(cumulativeMiles.value)}
          note={cumulativeMiles.note}
        />
        <RollupStat
          label="Unsupervised miles"
          value={numberFmt(cumulativeUnsupervisedMiles.value)}
          note={cumulativeUnsupervisedMiles.note}
        />
        <RollupStat
          label="Texas fleet (TxDMV)"
          value={numberFmt(texasFleetCount.value)}
          note={texasFleetCount.note}
        />
        <RollupStat
          label="NHTSA-reported incidents"
          value={incidents ? numberFmt(incidents.summary.totalIncidents) : "—"}
          note={incidents ? `Live from NHTSA's SGO dataset, fetched ${new Date(incidents.summary.fetchedAt).toLocaleDateString()}` : "Unavailable right now"}
        />
      </div>

      <div className="flex w-full flex-col gap-4 text-left">
        <div className="text-sm uppercase tracking-wide text-white/50">Cities</div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {robotaxiCities.map((city) => (
            <CityCard key={city.id} city={city} />
          ))}
        </div>
      </div>

      <div className="w-full text-left">
        <div className="mb-4 text-sm uppercase tracking-wide text-white/50">Notable sightings</div>
        <ul className="flex flex-col gap-3">
          {notableSightings.map((s) => (
            <li key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/40">
                <span>{s.city}</span>
                <span>·</span>
                <span>{s.vehicleType}</span>
                <span>·</span>
                <span>{s.date}</span>
              </div>
              <p className="mt-1 text-white/60">{s.description}</p>
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-white/40 underline decoration-white/20 hover:text-white/60"
              >
                {s.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
