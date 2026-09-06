"use client";

import { useState, type ReactNode } from "react";

// A collapsible section, so the panel opens calm instead of landing every
// module at once. Nothing is removed — the detail is one click away, and each
// header carries a count so the reader can tell what is inside before opening.
//
// Uses a real <button> with aria-expanded/aria-controls rather than
// <details>/<summary>: the panel styles its own disclosure chevron and needs
// the open state in React anyway, and <details> brings default markers and
// inconsistent cross-browser animation with it.
export default function RobotaxiSection({
  id,
  title,
  summary,
  count,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  count?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-content`}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-white/90">{title}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-white/40">{summary}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            {count && (
              <span className="font-mono text-[11px] tabular-nums text-white/45">{count}</span>
            )}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={`text-white/35 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
      </h2>

      {/* Unmounted rather than hidden while closed: several of these render
          tables and charts, and keeping them mounted would cost layout work
          for content nobody is looking at. */}
      {open && (
        <div id={`${id}-content`} className="border-t border-white/10 p-3">
          {children}
        </div>
      )}
    </section>
  );
}
