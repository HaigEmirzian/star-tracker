"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  humanityPosition,
  kardashevLastUpdated,
  kardashevStages,
} from "@/lib/data/kardashev";

// --- Zoom-out illusion, free-scroll variant --------------------------------
//
// No single photograph zooms continuously from Earth to the Milky Way — real
// astronomy imagery is discrete captures at wildly different distances. This
// variant builds the "pulling back" read *without* touching the scroll:
//
//  1. Each stage is an ordinary full-viewport section stacked in the
//     document, so the wheel/trackpad/scrollbar behave exactly as they do on
//     the rest of the page. Nothing is hijacked, nothing is snapped by JS.
//  2. Each successive stage renders its image *smaller inside its own
//     frame* — the planet nearly fills the viewport, the star sits back from
//     it, the galaxy is a distant speck. Scrolling down therefore reads as
//     the camera retreating, purely from the fixed sizes below.
//  3. An IntersectionObserver flips a per-section "revealed" flag once the
//     section is meaningfully on screen; a CSS transition then carries it
//     from a slightly smaller scale + zero opacity to full size + full
//     opacity. No scroll-position math is involved anywhere.
//
// Frame size per stage. These are the whole zoom-out effect — keep them
// strictly decreasing.
const STAGE_FRAME_SIZE = [
  "min(78vmin, 78vw)", // Type I  — planet fills the frame
  "min(48vmin, 48vw)", // Type II — star, noticeably further off
  "min(28vmin, 28vw)", // Type III — galaxy, most distant of all
];

// How small a section starts before it animates in, and how long that takes.
const ENTER_SCALE = 0.82;
const ENTER_MS = 900;

// Fraction of a section that must be on screen before it animates in. Low
// enough that the animation plays while the section is arriving rather than
// after it has already settled.
const REVEAL_RATIO = 0.3;

// A 10%-tall band across the middle of the viewport. Whichever section
// overlaps it is "the one you're looking at" — used only to light the
// progress dots, never to move the scroll.
const CENTER_BAND_MARGIN = "-45% 0px -45% 0px";

/**
 * Thin white leader line running from near the body out to the caption,
 * plus the caption itself. Fades in with its section.
 */
function StageCaption({
  stage,
  visible,
}: {
  stage: (typeof kardashevStages)[number];
  visible: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Caption block sits bottom-left on mobile, mid-left on larger screens */}
      <div className="absolute bottom-24 left-6 max-w-xs sm:bottom-auto sm:left-12 sm:top-1/2 sm:max-w-sm sm:-translate-y-1/2">
        {/* Leader line: a hairline rule that reads as pointing at the body */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-16 bg-white/60 sm:w-24" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
        </div>

        <div className="text-xs uppercase tracking-widest text-white/60">
          Type {stage.type}
        </div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {stage.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {stage.description}
        </p>
        <div className="mt-4 text-sm font-medium text-white">
          {stage.powerLabel}
        </div>
      </div>
    </div>
  );
}

/** Static, non-animated fallback used when the user prefers reduced motion. */
function ReducedMotionStages() {
  return (
    <div className="flex flex-col gap-16 py-8">
      {kardashevStages.map((stage) => (
        <section key={stage.id} className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-black sm:w-64">
            <Image
              src={stage.imageUrl}
              alt={stage.imageAlt}
              fill
              sizes="(min-width: 640px) 16rem, 100vw"
              className="object-cover"
            />
          </div>
          <div className="text-left">
            <div className="text-xs uppercase tracking-widest text-white/60">
              Type {stage.type}
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {stage.title}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-white/70">
              {stage.description}
            </p>
            <div className="mt-3 text-sm font-medium text-white">{stage.powerLabel}</div>
            <div className="mt-2 text-xs text-white/30">
              Image: {stage.imageCredit}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ScalePanel() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    kardashevStages.map(() => false),
  );
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Matches the existing convention in Starfield.tsx: read the media query
  // in JS rather than duplicating the behavior in CSS.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The page itself is the scroll container (these sections sit in normal
  // document flow), so the snap declaration has to live on the root element
  // — a `scroll-snap-type` on a non-scrolling wrapper does nothing. It's set
  // imperatively rather than in globals.css because it must apply only while
  // this tab is mounted, and it's `proximity` so it nudges toward a stage
  // without ever trapping a scroll mid-gesture.
  useEffect(() => {
    if (reducedMotion) return;
    const root = document.documentElement;
    const previous = root.style.scrollSnapType;
    root.style.scrollSnapType = "y proximity";
    return () => {
      root.style.scrollSnapType = previous;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const sections = sectionRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    // Reveal: latch each section on the first time it's sufficiently in view
    // and stop watching it. Latching (rather than toggling) means scrolling
    // back up doesn't re-play the animation in your face.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        const hits: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = sectionRefs.current.indexOf(entry.target as HTMLElement);
          if (i < 0) continue;
          hits.push(i);
          revealObserver.unobserve(entry.target);
        }
        if (hits.length === 0) return;
        setRevealed((prev) => {
          let next = prev;
          for (const i of hits) {
            if (prev[i]) continue;
            if (next === prev) next = [...prev];
            next[i] = true;
          }
          return next;
        });
      },
      { threshold: REVEAL_RATIO },
    );

    // Active: which section currently crosses the middle of the viewport.
    const activeObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = sectionRefs.current.indexOf(entry.target as HTMLElement);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: CENTER_BAND_MARGIN, threshold: 0 },
    );

    for (const section of sections) {
      revealObserver.observe(section);
      activeObserver.observe(section);
    }
    return () => {
      revealObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="mx-auto max-w-4xl">
        <ReducedMotionStages />
        <ScaleFootnote />
      </div>
    );
  }

  return (
    <div>
      {/* Breaks out of <main>'s horizontal padding so the stages run edge to
          edge. Note this wrapper is transformed (-translate-x-1/2), which
          would make any `fixed` descendant position against *it* rather than
          the viewport — which is why the progress dots live outside it. */}
      <div className="relative left-1/2 w-[100vw] -translate-x-1/2 bg-black">
        {kardashevStages.map((stage, i) => {
          const isRevealed = revealed[i];
          return (
            <section
              key={stage.id}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              aria-label={`Type ${stage.type} — ${stage.title}`}
              // scroll-snap-align lives on the sections; the matching
              // scroll-snap-type is set on <html> in the effect above.
              //
              // Stage I is deliberately left unsnapped. It starts ~150px down
              // the page (below the tab bar), so a `center` alignment puts a
              // snap point there — and measuring it in Chrome, that point
              // captures every scroll offset from 0 to ~300px: switching to
              // this tab yanked the page down to 149 on its own, and scrolling
              // back up snapped straight back, leaving the tab toggle
              // unreachable. Snapping only earns its keep *between* stages.
              className={`relative flex h-[100svh] items-center justify-center overflow-hidden ${
                i === 0 ? "" : "snap-center"
              }`}
            >
              <div
                className="transition-[transform,opacity] ease-out will-change-transform"
                style={{
                  width: STAGE_FRAME_SIZE[i],
                  height: STAGE_FRAME_SIZE[i],
                  transform: `scale(${isRevealed ? 1 : ENTER_SCALE})`,
                  opacity: isRevealed ? 1 : 0,
                  transitionDuration: `${ENTER_MS}ms`,
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-full">
                  <Image
                    src={stage.imageUrl}
                    alt={stage.imageAlt}
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    className="object-cover"
                  />
                </div>
              </div>

              <StageCaption stage={stage} visible={isRevealed} />

              {/* Image credit — required for the ESO photo (CC BY 4.0), and
                  NASA asks to be acknowledged as the source of its imagery. */}
              <div className="pointer-events-none absolute bottom-6 right-6 text-right text-[10px] leading-relaxed text-white/30 sm:right-12">
                Image: {stage.imageCredit}
              </div>

              {/* Scroll hint on the first stage only, gone once you've moved */}
              {i === 0 && (
                <div
                  className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/40 transition-opacity duration-500 ${
                    active === 0 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Scroll to zoom out
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Stage progress dots — "you are here", and a shortcut to each stage.
          Fixed so they ride along the whole scroll rather than scrolling away
          with the first section, and therefore kept out of the transformed
          full-bleed wrapper above. */}
      <div className="pointer-events-none fixed right-6 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3 sm:right-12">
        {kardashevStages.map((stage, i) => (
          <button
            key={stage.id}
            type="button"
            onClick={() =>
              sectionRefs.current[i]?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
            aria-label={`Scroll to Type ${stage.type} — ${stage.title}`}
            aria-current={i === active}
            className={`pointer-events-auto h-2 w-2 rounded-full transition-colors ${
              i === active ? "bg-white" : "bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      <div className="mx-auto max-w-4xl">
        <ScaleFootnote />
      </div>
    </div>
  );
}

function ScaleFootnote() {
  return (
    <div className="mt-10 border-t border-white/10 pt-6 text-left text-xs text-white/30">
      <p>
        {humanityPosition.label}: ≈{humanityPosition.value} — {humanityPosition.note}
      </p>
      <p className="mt-2">
        Scale proposed by Nikolai Kardashev (1964). Power figures via{" "}
        <a
          href={kardashevStages[0].powerSource}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/20 hover:text-white/50"
        >
          {kardashevStages[0].powerSourceLabel}
        </a>
        . Data last updated {kardashevLastUpdated}.
      </p>
    </div>
  );
}
