# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A live tracker for SpaceX's space infrastructure: the **Starlink** broadband
constellation and **Starmind**, SpaceX's orbital AI data center program (built
with Nvidia), plus a **Deals** tab tracking SpaceX's third-party AI compute
contracts (Colossus data center leases) and a **Scale** tab visualizing the
Kardashev scale. Single-page app with a Starmind/Starlink/Deals/Scale tab
toggle over an animated starfield background — no routing, no database.

## Commands

```bash
npm run dev      # start dev server (Turbopack) at localhost:3000
npm run build    # production build (webpack — see note below)
npm run start    # serve the production build
npm run lint     # eslint
npx tsc --noEmit # type-check only
```

There is no test suite in this repo.

**`npm run build` uses `next build --webpack`, not Turbopack.** Turbopack's
production build stalls indefinitely (no error, no progress) on this
project's dependency graph — reproduced repeatedly, isolated from every
other cause (stray processes, lock contention) before concluding it's a
genuine Turbopack limitation with this combination of large libraries
(three.js/globe.gl/three-globe + satellite.js's dynamic wasm import). `npm
run dev` stays on Turbopack and works fine — only the production build path
is affected. Don't revert `build` to plain `next build` without confirming
Turbopack's build path has actually been fixed upstream first.

## Architecture

**No database, ever (by design).** All data is fetched server-side and
cached via Next.js's Data Cache (`fetch`'s `next.revalidate`, or
`unstable_cache` where a stale-fallback is needed). This is what keeps the
site deployable for free on Vercel's Hobby tier with zero backing services.
Do not introduce a database or KV store to solve a caching problem — solve it
with Next.js's built-in cache semantics instead (see `lib/data/celestrak.ts`
for the pattern: wrap the raw fetch in `unstable_cache`, throw on failure
rather than returning null/empty, and Next.js will keep serving the last
successful result instead of the page going blank).

**Data flow:** `app/page.tsx` is a Server Component that fetches everything
(`lib/data/*`) in parallel, then hands it as props into
`components/TabSwitcher.tsx` — a Client Component that owns which tab is
active. Because `TabSwitcher` imports `StarlinkPanel`/`StarmindPanel`/
`StarlinkGrowthChart`/`DealsPanel`/`ScalePanel` directly (not via
`children`), those are part of the client module graph too, even without
their own `"use client"` directive. `DealsPanel` and `ScalePanel` are the
exceptions to the props-from-the-server pattern — their content
(`lib/data/dealsStatic.ts`, `lib/data/kardashev.ts`) is static, so neither
needs a server fetch or takes props.
Anything in that tree that depends on wall-clock time (`Date.now()`) must
compute it in a `useEffect` after mount, not during render — render also runs
during SSR, and baking "now" into the server-rendered HTML causes a hydration
mismatch against the client's actual time (see the `useNow()` hook in
`StarlinkPanel.tsx`).

**Data sources** (`lib/data/`):
- `celestrak.ts` — live satellite orbital data from CelesTrak, exposed via a
  single `getStarlinkData()` call returning both the computed summary and
  the raw per-satellite entries (one fetch feeds both — see below). **Rate
  limited to updates every ~2 hours per dataset** — repeated requests return
  a 403 with a plain-text body instead of JSON. Also derives the "active
  satellites by launch year" growth chart from each satellite's `OBJECT_ID`
  (international launch designator, e.g. `2019-074B` → launched 2019) rather
  than persisting our own historical snapshots.
- `launchLibrary.ts` — live launch history/manifest from Launch Library 2
  (TheSpaceDevs). Parses satellite-per-launch counts out of free-text mission
  descriptions (`"A batch of 24 satellites..."`); falls back to a labeled
  estimate (`satelliteCountIsEstimate: true`) when the text doesn't state a
  number. Never invent a number without that flag.
- `fccStatic.ts`, `starmindStatic.ts` — manually maintained public facts with
  no reliable free live API (FCC authorization ceilings, SpaceX's stated
  network capacity, the Starmind/Nvidia partnership timeline). Each has a
  `lastUpdated` field. **Never add invented/estimated numbers to these
  files** — only publicly confirmed figures, updated by hand as new filings
  or announcements land. This is especially strict for `starmindStatic.ts`:
  Starmind has no live telemetry yet, so the UI intentionally renders its
  metrics grid as locked/pending (`StarmindPanel.tsx`) rather than showing a
  number.
- `dealsStatic.ts` — manually maintained data on SpaceX's third-party AI
  compute contracts (Colossus data center leases with Anthropic, Google,
  Reflection AI, plus the Cursor acquisition), rendered by `DealsPanel.tsx`.
  Same discipline as `fccStatic.ts`/`starmindStatic.ts`: every dollar/GPU/
  power figure carries a source URL, a `dealsLastUpdated` field tracks
  freshness, and nothing here is estimated — these contracts land frequently
  enough that this file will need hand updates as new ones are announced.
- `kardashev.ts` — static content for the Scale tab: the three Kardashev
  stages' titles/descriptions and their power figures, each cited (Kardashev
  1964, restated by Britannica/Space.com) rather than invented, same
  discipline as `fccStatic.ts`/`starmindStatic.ts` above. The imagery isn't
  here — see the Scale tab section below.

**Styling:** Tailwind CSS v4, dark-only (space theme — black background,
white text), no light-mode variant. `components/Starfield.tsx` is a
`<canvas>`-based ambient star twinkle behind all content — no mouse/scroll
parallax (removed intentionally; keep it that way unless asked to re-add).

**Charts:** Recharts. `StarlinkGrowthChart.tsx` follows a validated
single-hue-sequential color (`#3987e5`, checked against this project's black
background via the dataviz skill's palette validator) — if adding another
chart, load the `dataviz` skill first rather than picking colors ad hoc.

**3D globe:** `components/tabs/StarlinkGlobe.tsx` renders real satellite
positions (not simulated) — the same `StarlinkGpEntry` objects from
`celestrak.ts` are fed straight into `satellite.js`'s `json2satrec()` (its
input shape matches CelesTrak's OMM/JSON fields exactly) and propagated with
real SGP4, the same algorithm every serious tracker uses. Positions refresh
every few seconds (`POSITION_REFRESH_MS`), not per-frame — re-propagating
thousands of satellites 60×/sec is unnecessary at LEO angular speeds and
wasteful. Rendered on `globe.gl`'s **particles** layer, not its `points`
layer — `points` is a bar/pin-chart primitive anchored to the surface (wrong
shape for a free-floating satellite); `particles` renders true floating
dots. Loaded via `next/dynamic({ ssr: false })` since it touches
`window`/`document` and pulls in three.js (~600KB).

`satellite.js`'s optional WASM propagator (unused — this project only calls
its plain pure-JS API) is why `next.config.ts` has webpack/turbopack config
you shouldn't remove: it's loaded via `import('#wasm-*-thread')`, a dynamic
import with a static specifier, so bundlers still eagerly resolve that chunk
even though nothing here ever calls the functions that would trigger it. That
chunk's Emscripten loader has top-level `node:module`/`node:worker_threads`
imports, which webpack 5 rejects with `UnhandledSchemeError` unless
`IgnorePlugin` skips the chunk (see `next.config.ts`) — this is *why*
`npm run build` runs webpack instead of Turbopack in the first place (see
Commands section above).

**Scale tab:** `components/tabs/ScalePanel.tsx` shows the Kardashev scale
(planet → star → galaxy) as three stages connected by two short cinematic
zoom videos (`public/videos/kardashev-type1-type2.mp4`,
`-type2-type3.mp4`; poster stills in `public/images/kardashev/`). A wheel/
touch/arrow-key gesture scrubs the relevant video instead of the page
scrolling — this went through several failed approaches (still photos
crossfading via CSS transform/mask/vignette never blended cleanly into the
black background at every zoom level) before landing on real video. Two
things here are easy to break if touched carelessly:
- **Forward vs. backward playback.** Moving deeper into the scale just
  calls `.play()` (sped up via `playbackRate` to hit `TRANSITION_MS`
  regardless of the source clip's real length) and advances the stage on
  `ended`. Moving back has no native equivalent — browsers don't support
  negative `playbackRate` — so it manually walks `currentTime` backwards
  instead. That walk is paced off the video's own `seeked` event (with a
  short fallback timeout in case a seek lands on an already-current
  position and never fires one), not a plain `requestAnimationFrame` loop
  blindly reassigning `currentTime` every frame — the latter queues a new
  seek before the decoder finishes the last one and was the direct cause of
  a visible stutter on longer backward scrubs (e.g. Type III → Type I,
  chaining two scrubs). Keep this event-gated if touching `scrubVideo`.
- **The panel is `fixed inset-0`, not sized against `<main>`'s padding.**
  An earlier version tried `h-[calc(100svh-10rem)]` and consistently left
  ~38px of real, draggable page scroll below the panel — sizing a full-bleed
  section against a hand-computed padding/footer height doesn't stay exact.
  Taking it out of flow entirely removes the possibility. `TabSwitcher.tsx`
  lifts the tab bar to `z-10` so it stays above this panel's `z-0`, and
  `ScalePanel` locks `document.documentElement`/`body` `overflow: hidden`
  in a `useEffect` while mounted (skipped under reduced motion, since that
  path stays in-flow and scrollable on purpose).

Reduced motion (`prefers-reduced-motion`, read in JS the same way
`Starfield.tsx` does) renders static stacked sections instead — no video,
no scroll-hijacking.

**Accessibility:** The tab toggle (`TabSwitcher.tsx`) implements the ARIA
"tablist" pattern with roving `tabindex` (only the active tab is a Tab stop;
arrow keys move between tabs) plus a global `ArrowLeft`/`ArrowRight`
shortcut that works from anywhere on the page. Do not disable the `Tab` key
itself — that breaks keyboard access to the rest of the page.
