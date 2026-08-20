"use client";

import { useEffect, useRef, useState } from "react";
import StarlinkPanel, { StarlinkPanelProps } from "@/components/tabs/StarlinkPanel";
import StarmindPanel from "@/components/tabs/StarmindPanel";
import ScalePanel from "@/components/tabs/ScalePanel";
import DealsPanel from "@/components/tabs/DealsPanel";

type Tab = "starlink" | "starmind" | "scale" | "deals";

const TABS = [
  { key: "starmind", label: "Starmind" },
  { key: "starlink", label: "Starlink" },
  { key: "deals", label: "Deals" },
  { key: "scale", label: "Scale" },
] as const;

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  );
}

export default function TabSwitcher({ starlinkData }: { starlinkData: StarlinkPanelProps }) {
  const [tab, setTab] = useState<Tab>("starmind");
  const buttonRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    starmind: null,
    starlink: null,
    scale: null,
    deals: null,
  });
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

  // Global shortcut: Left/Right arrows switch tabs from anywhere on the
  // page, without touching Tab's normal focus order. Skipped while focus
  // is already inside the tablist (the handler above covers that, and
  // additionally handles Home/End) or while typing in a form field.
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
      {/* z-10 keeps the tab bar above the Scale panel, which is fixed at z-0
          so it can fill the viewport without leaving stray page scroll. */}
      <div className="relative z-10 mb-10 flex justify-center">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Tracker section"
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
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => selectTab(t.key, false)}
              className={`rounded-full px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                tab === t.key
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "starmind" && <StarmindPanel />}
        {tab === "starlink" && <StarlinkPanel {...starlinkData} />}
        {tab === "deals" && <DealsPanel />}
        {tab === "scale" && <ScalePanel />}
      </div>
    </div>
  );
}
