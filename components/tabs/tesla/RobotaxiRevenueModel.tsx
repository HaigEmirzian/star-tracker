"use client";

import { useMemo, useState } from "react";
import { revenueInputs, type ModelInput } from "@/lib/data/robotaxiEconomics";
import { num, usdExact, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

// Estimates stay local to this calculator; cited inputs remain available below.
const KIND_STYLE = {
  disclosed: { chip: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200", label: "Tesla-disclosed" },
  reported: { chip: "border-sky-300/25 bg-sky-300/10 text-sky-200", label: "Press-reported" },
  assumption: { chip: "border-amber-300/30 bg-amber-300/10 text-amber-200", label: "Your assumption" },
} as const;

function InputRow({
  input,
  value,
  modified,
  onChange,
}: {
  input: ModelInput;
  value: number;
  modified: boolean;
  onChange: (v: number) => void;
}) {
  const style = KIND_STYLE[input.kind];
  const locked = input.kind === "disclosed";
  const display = input.unit === "$" ? `$${value.toFixed(2)}` : `${num(value)}${input.unit === "%" ? "%" : ""}`;

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`ri-${input.id}`} className="text-sm text-white/70">
          {input.label}
          {input.unit !== "$" && input.unit !== "%" && (
            <span className="ml-1 text-white/25">{input.unit}</span>
          )}
        </label>
        <div className="flex items-center gap-1.5">
          {modified && (
            <span className="rounded border border-amber-300/30 bg-amber-300/10 px-1 py-px text-[9px] uppercase tracking-wider text-amber-200">
              edited
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-white">{display}</span>
        </div>
      </div>

      <input
        id={`ri-${input.id}`}
        type="range"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      />

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className={`rounded border px-1 py-px text-[9px] uppercase tracking-wider ${style.chip}`}>
          {style.label}
        </span>
        {input.source ? (
          <a
            href={input.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-white/30 underline decoration-white/15 underline-offset-2 hover:text-white/60"
          >
            {input.sourceLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function RobotaxiRevenueModel() {
  const defaults = useMemo(
    () => Object.fromEntries(revenueInputs.map((i) => [i.id, i.value])) as Record<string, number>,
    [],
  );
  const [values, setValues] = useState<Record<string, number>>(defaults);

  const modifiedIds = revenueInputs.filter((i) => values[i.id] !== defaults[i.id]).map((i) => i.id);

  const v = (id: string) => values[id] ?? defaults[id];
  const paidMiles = v("paidMiles");
  const avgTrip = v("avgTripMiles");
  const base = v("baseFare");
  const perMile = v("perMileFare");
  const costPerMile = v("costPerMile");
  const deadhead = v("deadheadShare") / 100;

  const trips = paidMiles / avgTrip;
  const farePerTrip = base + avgTrip * perMile;
  const grossFares = trips * farePerTrip;
  const totalMiles = paidMiles / Math.max(1 - deadhead, 0.01);
  const operatingCost = totalMiles * costPerMile;
  const netOfDirectCost = grossFares - operatingCost;

  return (
    <div className="rounded-lg border border-dashed border-amber-300/25 bg-amber-300/[0.03] p-3">
      <SectionLabel
        right={
          modifiedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setValues(defaults)}
              className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50 hover:text-white"
            >
              Reset ({modifiedIds.length} edited)
            </button>
          ) : undefined
        }
      >
        <span className="text-amber-200/80">Fare & cost estimate</span>
      </SectionLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Output
            label="Estimated trips"
            value={num(Math.round(trips))}
          />
          <Output
            label="Passenger fares"
            value={usdExact(grossFares)}
            emphasis
          />
          <Output
            label="Direct costs"
            value={usdExact(operatingCost)}
          />
          <Output
            label="Fares less direct costs"
            value={usdExact(netOfDirectCost)}
          />

      </div>
      <details className="mt-4 border-t border-white/10 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-white/70">Adjust inputs & sources</summary>
        <div className="mt-3 grid gap-x-5 sm:grid-cols-2">
          {revenueInputs.map((input) => (
            <InputRow
              key={input.id}
              input={input}
              value={v(input.id)}
              modified={modifiedIds.includes(input.id)}
              onChange={(next) => setValues((prev) => ({ ...prev, [input.id]: next }))}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function Output({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-2">
      <div className="text-sm text-white/60">{label}</div>
      <div
        className={`mt-0.5 font-mono tabular-nums ${
          emphasis ? "text-2xl font-semibold text-amber-100" : "text-lg font-medium text-white/85"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
