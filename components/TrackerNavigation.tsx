import type { ReactNode } from "react";

export default function TrackerNavigation({ children, siteToggle }: { children: ReactNode; siteToggle?: ReactNode }) {
  return (
    <div className="relative z-10 mb-4 grid min-w-0 items-center gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="min-w-0 max-w-full justify-self-center overflow-x-auto lg:col-start-2 lg:row-start-1">
        {children}
      </div>
      {siteToggle && <div className="row-start-1 justify-self-end lg:col-start-3">{siteToggle}</div>}
    </div>
  );
}
