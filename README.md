# Starmind / Starlink Tracker

A live tracker for SpaceX's space infrastructure: the **Starlink** broadband
constellation and **Starmind**, SpaceX's orbital AI data center program built
with Nvidia. A third **Scale** tab visualizes the Kardashev scale (planet →
star → galaxy) as a scroll-driven zoom through two short videos.

## Data sources

- **Starlink satellite count & orbital shells** — [CelesTrak](https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json)
  (live TLE/orbital-element data, rate-limited to updates every ~2 hours).
- **Launch history & manifest** — [Launch Library 2](https://thespacedevs.com/llapi) (TheSpaceDevs).
- **FCC authorization figures** — manually maintained in `lib/data/fccStatic.ts`
  (no reliable free live API for these; update as filings change).
- **Starmind program facts** — manually maintained in `lib/data/starmindStatic.ts`.
  Starmind has no live telemetry yet; deployment metrics (satellites, power,
  compute) are intentionally shown as locked/pending until SpaceX discloses
  real numbers. Do not add fabricated figures to that file.
- **Kardashev scale figures** — manually maintained in `lib/data/kardashev.ts`,
  citing Kardashev's original 1964 thresholds as restated by Britannica/
  Space.com. The Scale tab's videos/poster images live under `public/videos/`
  and `public/images/kardashev/` rather than in this data file.

None of the "manual" files should ever contain invented numbers — only
publicly confirmed facts, with a `lastUpdated` date.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- No database — all data is fetched server-side and cached via Next.js ISR
  (`next: { revalidate: ... }` on each `fetch`), so this deploys for free on
  Vercel's Hobby tier with zero extra infra.
- CelesTrak throttles repeat requests per dataset; the fetch helper in
  `lib/data/celestrak.ts` treats a non-2xx response as "temporarily
  unavailable" and falls back gracefully rather than erroring the page.

## Deploy

Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new) — no environment variables or database setup required for v1.
