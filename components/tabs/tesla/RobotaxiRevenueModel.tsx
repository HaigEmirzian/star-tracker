"use client";

import { useMemo, useState } from "react";
import { revenueInputs, modelCaveats, type ModelInput } from "@/lib/data/robotaxiEconomics";
import { num, usdExact, SectionLabel } from "@/components/tabs/tesla/robotaxiUi";

// The ONLY place in this panel where a number Tesla never disclosed may
// appear. Everything here renders in a separate visual register — dashed
// amber border, a DERIVED chip, and the arithmetic printed under each output —
// so it can never be mistaken for the disclosed metrics above it.
//
// Rules, in order of importance:
//   1. Nothing computed here leaves this component. Not the KPI strip, not a
//      chart beside disclosed data, never written back into robotaxiStatic.ts.
//   2. Every input says where it came from, and says so louder when it came
//      from nowhere (kind: "assumption").
//   3. Show the arithmetic. Visible long division is what stops a modelled
//      figure from reading as a fact.

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
        <label htmlFor={`ri-${input.id}`} className="text-[11px] text-white/60">
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
        ) : (
          <span className="text-[10px] text-amber-200/50">no published figure exists</span>
        )}
      </div>
      {input.note && <p className="mt-1 text-[10px] leading-snug text-white/30">{input.note}</p>}
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
        <span className="text-amber-200/80">Revenue model — derived</span>
      </SectionLabel>

      <p className="mb-3 text-[11px] leading-snug text-amber-100/50">
        Tesla does not disclose robotaxi revenue, FSD revenue, ARPU or churn — all of it sits inside
        &ldquo;Services &amp; Other&rdquo; with no breakout. Every figure below is computed from the cited
        inputs. It is a model, not a disclosure.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="divide-y divide-white/5">
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

        <div className="flex flex-col gap-2">
          <Output
            label="≈ Modelled trips"
            value={num(Math.round(trips))}
            formula={`${num(paidMiles)} paid mi ÷ ${avgTrip} mi per trip`}
          />
          <Output
            label="≈ Modelled gross passenger fares"
            value={usdExact(grossFares)}
            formula={`${num(Math.round(trips))} trips × ($${base.toFixed(2)} + ${avgTrip} mi × $${perMile.toFixed(2)}/mi) = ${num(Math.round(trips))} × $${farePerTrip.toFixed(2)}`}
            emphasis
          />
          <Output
            label="≈ Modelled direct operating cost"
            value={usdExact(operatingCost)}
            formula={`${num(paidMiles)} paid mi ÷ (1 − ${Math.round(deadhead * 100)}% deadhead) = ${num(Math.round(totalMiles))} total mi × $${costPerMile.toFixed(2)}/mi`}
          />
          <Output
            label="≈ Fares less direct cost"
            value={usdExact(netOfDirectCost)}
            formula="gross fares − direct operating cost. Not profit: excludes depreciation, insurance, remote operators, depots and capex."
          />

          <div className="mt-1 rounded border border-white/10 bg-black/20 p-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              What this does not capture
            </div>
            <ul className="flex flex-col gap-1 text-[10px] leading-snug text-white/35">
              {modelCaveats.map((c) => (
                <li key={c} className="flex gap-1.5">
                  <span className="text-white/20">·</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Output({
  label,
  value,
  formula,
  emphasis,
}: {
  label: string;
  value: string;
  formula: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div
        className={`mt-0.5 font-mono tabular-nums ${
          emphasis ? "text-2xl font-semibold text-amber-100" : "text-lg font-medium text-white/85"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] leading-snug text-white/30">{formula}</div>
    </div>
  );
}
