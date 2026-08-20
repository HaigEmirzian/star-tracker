// Manually maintained, cited data for the Kardashev scale (Scale tab).
// Same discipline as fccStatic.ts / starmindStatic.ts / gpuSpecs.ts: every
// figure traces to a real published source, never interpolated or invented.
//
// The scale itself is Nikolai Kardashev's 1964 classification of a
// civilization by how much energy it can harness. The power figures below
// are the standard modern restatements of his three types — order-of-
// magnitude by nature (Kardashev defined them as rough thresholds, not
// precise measurements), which is why each carries an `approximate` note
// rather than being presented as an exact value.

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
  /** Image representing this scale, hotlinked from a public/CC source. */
  imageUrl: string;
  imageAlt: string;
  /**
   * Fraction of the image's height to clip off the bottom, 0-1. Used where
   * the source has burned-in text at the frame edge (SDO stamps the
   * instrument and observation time onto its images). Clipping is done in
   * CSS rather than by re-hosting a doctored copy, so the image stays the
   * publisher's own file.
   */
  cropBottom?: number;
  /**
   * The source image's natural width / height. The frame is built to this
   * ratio so the soft edge mask lands on the image's real edges instead of
   * on letterbox padding.
   */
  aspect: number;
  /**
   * Feather the frame's edges. Only needed for images whose subject runs to
   * the frame edge; one sitting on a black field already blends into the
   * black page and is better left alone, since any fade would eat into the
   * subject itself.
   */
  fadeEdges?: boolean;
  /** Attribution line — required for the ESO image (CC BY 4.0), and NASA
   *  asks to be acknowledged as the source even though its imagery isn't
   *  copyrighted. */
  imageCredit: string;
  imageSourcePage: string;
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
    imageUrl:
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/globe_east_2048.jpg",
    imageAlt: "Earth photographed as a full disk from space, the Blue Marble",
    aspect: 2048 / 2048,
    imageCredit: "NASA",
    imageSourcePage: "https://visibleearth.nasa.gov/images/57723/the-blue-marble",
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
    // SDO publishes a rolling "latest" full-disk image rather than a stable
    // per-observation URL. Using it means this panel shows the actual Sun as
    // observed within the last few hours — fitting for a project built
    // around live data, at the cost of the exact frame not being fixed.
    imageUrl: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg",
    imageAlt:
      "The Sun as a full disk in extreme ultraviolet, showing its corona and active regions",
    // SDO burns "SDO/AIA 171 <date> UT" into the bottom of every frame. The
    // disc ends around 92% of frame height, so clipping 8% removes the text
    // without touching the corona.
    cropBottom: 0.08,
    aspect: 2048 / 2048,
    imageCredit: "NASA/SDO",
    imageSourcePage: "https://sdo.gsfc.nasa.gov/data/",
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
    imageUrl: "https://cdn.eso.org/images/publicationjpg/eso0932a.jpg",
    imageAlt:
      "A 360-degree panorama of the Milky Way arching across the night sky",
    aspect: 4000 / 2000,
    // The only one that needs it: a star field running to all four edges,
    // on a dark-grey rather than black background.
    fadeEdges: true,
    imageCredit: "ESO/S. Brunier (CC BY 4.0)",
    imageSourcePage: "https://www.eso.org/public/images/eso0932a/",
  },
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

export const kardashevLastUpdated = "2026-08-19";
