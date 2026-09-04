"use client";

import { useEffect, useRef, useState } from "react";
import RobotaxiPanel from "@/components/tabs/tesla/RobotaxiPanel";
import type { RobotaxiIncidentData } from "@/lib/data/nhtsaRobotaxi";

// Only one tab today ("robotaxi") — kept as a union type and the same
// ARIA-tablist shape as TabSwitcher.tsx so adding a second Tesla tab later
// (e.g. Optimus, Energy) is a small diff rather than a rewrite.
type Tab = "robotaxi";

const TABS = [{ key: "robotaxi", label: "Robotaxi" }] as const;

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export interface TeslaTabSwitcherProps {
  incidents: RobotaxiIncidentData | null;
}

export default function TeslaTabSwitcher({ incidents }: TeslaTabSwitcherProps) {
  const [tab, setTab] = useState<Tab>("robotaxi");
  const buttonRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ robotaxi: null });
  const tablistRef = useRef<HTMLDivElement>(null);

  function selectTab(key: Tab, focusButton: boolean) {
    setTab(key);
    if (focusButton) buttonRefs.current[key]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const currentIndex = TABS.findIndex((t) => t.key === tab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectTab(TABS[(currentIndex + 1) % TABS.length].key, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectTab(TABS[(currentIndex - 1 + TABS.length) % TABS.length].key, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(TABS[0].key, true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(TABS[TABS.length - 1].key, true);
    }
  }

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (isTypingTarget(e.target)) return;
      if (tablistRef.current?.contains(e.target as Node)) return;

      e.preventDefault();
      setTab((current) => {
        const currentIndex = TABS.findIndex((t) => t.key === current);
        const nextIndex =
          e.key === "ArrowRight"
            ? (currentIndex + 1) % TABS.length
            : (currentIndex - 1 + TABS.length) % TABS.length;
        return TABS[nextIndex].key;
      });
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  return (
    <div className="w-full">
      <div className="relative z-10 mb-6 flex justify-center">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Tesla tracker section"
          onKeyDown={onKeyDown}
          className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-sm"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                buttonRefs.current[t.key] = el;
              }}
              role="tab"
              id={`tesla-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`tesla-panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => selectTab(t.key, false)}
              className={`rounded-full px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                tab === t.key ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`tesla-panel-${tab}`} aria-labelledby={`tesla-tab-${tab}`}>
        {tab === "robotaxi" && <RobotaxiPanel incidents={incidents} />}
      </div>
    </div>
  );
}
