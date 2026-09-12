import { useEffect, useState } from "react";

// Any Date.now()-derived display must be computed client-side after mount:
// panels render during SSR/ISR too, and baking "now" into that render would
// either mismatch the client's hydration time (React warning) or go stale for
// up to the ISR revalidate window. This is the standard "defer a client-only
// value past hydration" exception to the no-setState-in-effect rule (not a
// cascading-render risk — it fires once on mount).
//
// useSyncExternalStore isn't a safe alternative here: panels actually
// unmount/remount on every tab switch, so a module-level cached snapshot
// would freeze "now" at first-ever mount instead of refreshing per visit.
//
// Callers MUST treat the null return as "not mounted yet" and render a
// placeholder, not a computed value — that null is what keeps the server HTML
// and the first client render identical.
//
// `intervalMs` opts into re-ticking (e.g. a news feed's "updated HH:MM").
// Omitted, this stays a one-shot read on mount.
export function useNow(intervalMs?: number): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    if (!intervalMs) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
