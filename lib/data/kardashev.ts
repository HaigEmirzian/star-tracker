// Manually maintained content for the Kardashev scale (Scale tab).
// Same discipline as fccStatic.ts / starmindStatic.ts / gpuSpecs.ts for the
// power figures below: every number traces to a real published source,
// never interpolated or invented.
//
// The scale itself is Nikolai Kardashev's 1964 classification of a
// civilization by how much energy it can harness. The power figures below
// are the standard modern restatements of his three types — order-of-
// magnitude by nature (Kardashev defined them as rough thresholds, not
// precise measurements), which is why each carries an `approximate` note
// rather than being presented as an exact value.
//
// The imagery is a pair of cinematic zoom-out videos (in public/videos/,
// see kardashevTransitionVideos below) rather than hotlinked photos —
// several rounds of trying to make single still photos blend seamlessly
// into the page background never fully worked, and the videos give an
// actual continuous zoom instead of a crossfade illusion between stills.

export interface KardashevStage {
  id: string;
  /** Roman numeral as displayed: "I" | "II" | "III". */
  type: string;
  /** Short name for the energy source, e.g. "Planetary". */
  title: string;
  /** One-to-two sentence explanation — this is the leader-line caption copy. */
  description: string;
  /** Human-readable power figure, e.g. "~4 × 10^26 W". */
  powerLabel: string;
  powerSource: string;
  powerSourceLabel: string;
  /**
   * Still frame shown before video playback starts (the <video>'s `poster`)
   * and in the reduced-motion fallback, which never plays video at all.
   */
  posterUrl: string;
  posterAlt: string;
}

export const kardashevStages: KardashevStage[] = [
  {
    id: "type-i",
    type: "I",
    title: "Planetary",
    description:
      "Harnesses all the energy available on its home planet — every drop of sunlight reaching it, plus everything stored in its winds, tides, and interior.",
    powerLabel: "~10¹⁶–10¹⁷ W",
    powerSource: "https://www.britannica.com/science/Kardashev-scale",
    powerSourceLabel: "Britannica — Kardashev scale",
    posterUrl: "/images/kardashev/type-i.jpg",
    posterAlt: "Earth seen from space, the opening frame of the zoom-out sequence",
  },
  {
    id: "type-ii",
    type: "II",
    title: "Stellar",
    description:
      "Captures the entire output of its star — roughly ten billion times a Type I civilization. Kardashev speculated this would require enclosing the star itself, the idea behind a Dyson sphere.",
    powerLabel: "~4 × 10²⁶ W",
    powerSource: "https://www.britannica.com/science/Kardashev-scale",
    powerSourceLabel: "Britannica — Kardashev scale",
    posterUrl: "/images/kardashev/type-ii.jpg",
    posterAlt: "The Sun, its surface alive with flares, midway through the zoom-out sequence",
  },
  {
    id: "type-iii",
    type: "III",
    title: "Galactic",
    description:
      "Commands the energy of an entire galaxy — hundreds of billions of stars, harvested across a hundred thousand light-years.",
    powerLabel: "~4 × 10³⁷ W",
    powerSource: "https://www.britannica.com/science/Kardashev-scale",
    powerSourceLabel: "Britannica — Kardashev scale",
    posterUrl: "/images/kardashev/type-iii.jpg",
    posterAlt: "A spiral galaxy, the closing frame of the zoom-out sequence",
  },
];

// One video per gap between stages: kardashevTransitionVideos[i] plays
// between kardashevStages[i] and kardashevStages[i + 1] (forward) or the
// reverse (backward). Each is a continuous zoom from one stage's framing to
// the next's, so at rest either end of a video matches that stage's poster.
export const kardashevTransitionVideos = [
  "/videos/kardashev-type1-type2.mp4",
  "/videos/kardashev-type2-type3.mp4",
];

// Carl Sagan extended Kardashev's three discrete types into a continuous
// scale; on it, present-day humanity sits at roughly 0.73 — not yet Type I.
export const humanityPosition = {
  value: 0.73,
  label: "Humanity today",
  note: "On Carl Sagan's continuous extension of the scale — not yet a Type I civilization.",
  source: "https://www.space.com/kardashev-scale",
  sourceLabel: "Space.com — The Kardashev scale",
};

export const kardashevLastUpdated = "2026-08-20";
