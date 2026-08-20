"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  humanityPosition,
  kardashevLastUpdated,
  kardashevStages,
} from "@/lib/data/kardashev";

// --- Zoom-out illusion -----------------------------------------------------
//
// No single photograph zooms continuously from Earth to the Milky Way — real
// astronomy imagery is discrete captures at wildly different distances. The
// continuity is built the same way every "cosmic zoom" does it: each stage's
// image is layered in the same fixed box, and moving forward scales the
// outgoing image *up* (it rushes past the viewer) while the incoming one
// scales from small to natural size. The net read is "pulling back", even
// though each frame is a separate photo.
//
// --- How it's driven (variant B: continuous) -------------------------------
//
// The scroll is NOT hijacked. The panel is simply a tall (SCROLL_VH) block
// with a `sticky` inner visual pinned to the top of the viewport, so the user
// scrolls the real page at the real speed with the real scrollbar — nothing
// is preventDefault()ed, nothing snaps, and the panel can never trap you.
//
// A passive `scroll` listener (rAF-coalesced, same pattern as Starfield.tsx)
// converts the section's position into `progress` in 0..1, and progress maps
// straight onto a fractional stage position:
//
//     pos = progress * (stageCount - 1)      // 0 .. 2
//
// Every layer then derives its own transform from its signed distance to that
// position (`d = pos - i`), so the zoom is a pure continuous function of
// scroll offset. Scroll half a stage and you are literally halfway between
// two photos — no easing timers, no transition-duration, no "locked" state.
const SCROLL_VH = 300;

// SCALE_PAST is how large a stage has grown once you're a full stage beyond
// it; SCALE_FUTURE is how small a stage sits a full stage before you reach
// it. Both are modest — overshooting makes the seam between photos obvious.
// Between those points the scale is interpolated *geometrically*
// (SCALE_PAST^d), not linearly: a zoom reads as constant-rate only when each
// equal scroll step multiplies the scale by the same factor.
const SCALE_PAST = 2.6;
const SCALE_FUTURE = 0.35;

// Beyond ±1 stage a layer is fully transparent anyway, so its scale is
// clamped — an unclamped 2.6^2 layer is a needlessly huge composited surface.
const SCALE_DISTANCE_CLAMP = 1.05;

// Captions hold at full opacity within CAPTION_HOLD of their stage, then ramp
// to zero by CAPTION_FADE_END. A plateau rather than the images' plain linear
// ramp, and deliberately finished *before* the halfway point: every caption
// occupies the same box, so two of them at 50% is just unreadable doubled
// text. This way each caption is solid for most of its stage and the handoff
// is a quick dip through near-transparency rather than a long overlap.
const CAPTION_HOLD = 0.25;
const CAPTION_FADE_END = 0.55;
// Captions also drift vertically with the same distance value, so the handoff
// reads as one caption leaving upward and the next rising into place —
// without it the two overlapping blocks read as one smeared paragraph.
const CAPTION_DRIFT_PX = 40;

const LAST_STAGE = kardashevStages.length - 1;

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Continuous transform for one image layer, given its signed distance from
 * the current fractional stage position (0 = you are exactly on this stage,
 * +1 = one full stage past it, -1 = one full stage before it).
 */
function layerStyle(distance: number) {
  const clamped = Math.max(
    -SCALE_DISTANCE_CLAMP,
    Math.min(SCALE_DISTANCE_CLAMP, distance),
  );
  const scale =
    clamped >= 0 ? SCALE_PAST ** clamped : SCALE_FUTURE ** -clamped;

  // sqrt() keeps the crossfade bright. Layers stack, so a plain linear
  // 50/50 crossfade composites to only ~75% coverage at the midpoint and the
  // black background shows through as a dip; sqrt holds each layer near 1
  // until the very end of its range, where it drops off quickly.
  const opacity = Math.sqrt(clamp01(1 - Math.abs(distance)));

  return { scale, opacity };
}

/** Continuous caption opacity for the same signed distance. */
function captionOpacity(distance: number) {
  return clamp01(
    (CAPTION_FADE_END - Math.abs(distance)) / (CAPTION_FADE_END - CAPTION_HOLD),
  );
}

/**
 * Thin white leader line running from near the body out to the caption,
 * plus the caption itself. Rendered per stage; its opacity/offset are driven
 * imperatively from the scroll handler, so the values here are only the
 * first-paint state.
 */
function StageCaption({
  stage,
  initialOpacity,
  initialDistance,
  captionRef,
}: {
  stage: (typeof kardashevStages)[number];
  initialOpacity: number;
  initialDistance: number;
  captionRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={captionRef}
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: initialOpacity,
        transform: `translateY(${-initialDistance * CAPTION_DRIFT_PX}px)`,
        willChange: "opacity, transform",
      }}
      aria-hidden={initialOpacity <= 0.5}
    >
      {/* Caption block sits bottom-left on mobile, mid-left on larger screens */}
      <div className="absolute bottom-16 left-6 max-w-xs sm:bottom-auto sm:left-12 sm:top-1/2 sm:max-w-sm sm:-translate-y-1/2">
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
  // Only used for the things that genuinely are discrete — which dot is
  // filled, which credit line is shown. Everything continuous is written
  // straight to the DOM in the rAF callback so scrolling doesn't force a
  // React render on every frame.
  const [nearestStage, setNearestStage] = useState(0);

  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);

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

  /**
   * The single place scroll position becomes visuals. `progress` is 0..1
   * across the sticky region; every layer/caption derives its own state from
   * it, so the mapping is continuous by construction.
   */
  const applyProgress = useCallback((progress: number) => {
    const position = progress * LAST_STAGE;

    for (let i = 0; i < layerRefs.current.length; i++) {
      const el = layerRefs.current[i];
      if (!el) continue;
      const { scale, opacity } = layerStyle(position - i);
      el.style.transform = `scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(4);
      // A fully transparent layer still costs a composited surface; skip it.
      el.style.visibility = opacity === 0 ? "hidden" : "visible";
    }

    for (let i = 0; i < captionRefs.current.length; i++) {
      const el = captionRefs.current[i];
      if (!el) continue;
      const distance = position - i;
      const opacity = captionOpacity(distance);
      el.style.opacity = opacity.toFixed(4);
      el.style.transform = `translateY(${(-distance * CAPTION_DRIFT_PX).toFixed(2)}px)`;
      el.setAttribute("aria-hidden", opacity > 0.5 ? "false" : "true");
    }

    if (hintRef.current) {
      // Gone by the time you've scrolled a quarter of the first stage.
      hintRef.current.style.opacity = clamp01(1 - position * 4).toFixed(4);
    }

    const nearest = Math.round(position);
    setNearestStage((current) => (current === nearest ? current : nearest));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    let rafId = 0;
    let queued = false;

    function measure() {
      queued = false;
      if (!section || !sticky) return;
      const rect = section.getBoundingClientRect();
      // Distance the page can scroll while the inner visual stays pinned.
      // Measured from the sticky element rather than window.innerHeight so
      // it stays correct on mobile, where the visible viewport shrinks and
      // grows as the URL bar hides.
      const travel = rect.height - sticky.offsetHeight;
      // rect.top is 0 exactly when the visual pins, and -travel when it
      // unpins at the bottom — so this is a straight linear read of the
      // scroll offset, with no smoothing or inertia of its own.
      const progress = travel <= 0 ? 0 : clamp01(-rect.top / travel);
      applyProgress(progress);
    }

    // Coalesce bursts of scroll events into one write per frame (the rAF
    // pattern used in Starfield.tsx).
    function schedule() {
      if (queued) return;
      queued = true;
      rafId = requestAnimationFrame(measure);
    }

    measure();
    // passive: true — the opposite of variant A. This handler must never be
    // able to block or alter the browser's own scrolling.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [applyProgress, reducedMotion]);

  /**
   * Dots are a shortcut, not a separate mechanic: they scroll the page to
   * the offset that *produces* that stage, so the zoom stays scroll-derived.
   */
  const scrollToStage = useCallback((index: number) => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky || LAST_STAGE === 0) return;
    const rect = section.getBoundingClientRect();
    const travel = Math.max(0, rect.height - sticky.offsetHeight);
    window.scrollTo({
      top: rect.top + window.scrollY + (travel * index) / LAST_STAGE,
      behavior: "smooth",
    });
  }, []);

  if (reducedMotion) {
    return (
      <div className="mx-auto max-w-4xl">
        <ReducedMotionStages />
        <ScaleFootnote />
      </div>
    );
  }

  return (
    <div
      ref={sectionRef}
      // Breaks out of <main>'s horizontal padding so the visual runs edge
      // to edge. Only the *bottom* padding is cancelled (-mb-16) —
      // cancelling the top too would pull the panel up over the tab bar.
      // The height is what the user actually scrolls through; the sticky
      // child below is what they see.
      className="relative left-1/2 -mb-16 w-[100vw] -translate-x-1/2 bg-black"
      style={{ height: `${SCROLL_VH}svh` }}
    >
      <div
        ref={stickyRef}
        aria-label="Kardashev scale, scroll to zoom out from planet to galaxy"
        className="sticky top-0 h-svh w-full overflow-hidden"
      >
        {/* Layered image stack — all stages occupy the same box; scale and
            opacity, both continuous functions of scroll, decide which one
            you're looking at. Later stages sit on top, so an incoming
            (wider) view fades in over the one rushing past beneath it. */}
        {kardashevStages.map((stage, i) => {
          // First-paint values for progress 0; the rAF handler takes over
          // immediately after mount.
          const { scale, opacity } = layerStyle(-i);
          return (
            <div
              key={stage.id}
              ref={(el) => {
                layerRefs.current[i] = el;
              }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(${scale})`,
                opacity,
                visibility: opacity === 0 ? "hidden" : "visible",
                willChange: "transform, opacity",
              }}
            >
              <div className="relative h-[min(78vmin,78vw)] w-[min(78vmin,78vw)] overflow-hidden rounded-full">
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
          );
        })}

        {/* Captions + leader lines, one per stage, cross-fading on the same
            continuous distance value as the images. */}
        {kardashevStages.map((stage, i) => (
          <StageCaption
            key={stage.id}
            stage={stage}
            initialDistance={-i}
            initialOpacity={captionOpacity(-i)}
            captionRef={(el) => {
              captionRefs.current[i] = el;
            }}
          />
        ))}

        {/* Stage progress dots — also the "you are here" affordance */}
        <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-3 sm:right-12">
          {kardashevStages.map((stage, i) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => scrollToStage(i)}
              aria-label={`Scroll to Type ${stage.type} — ${stage.title}`}
              aria-current={i === nearestStage}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === nearestStage ? "bg-white" : "bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Scroll hint, fades out as soon as the user moves at all */}
        <div
          ref={hintRef}
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/40"
          style={{ opacity: 1 }}
        >
          Scroll to zoom out
        </div>

        {/* Image credit — required for the ESO photo (CC BY 4.0), and NASA
            asks to be acknowledged as the source of its imagery. */}
        <div className="pointer-events-none absolute bottom-6 right-6 text-right text-[10px] leading-relaxed text-white/30 sm:right-12">
          Image: {kardashevStages[nearestStage].imageCredit}
        </div>
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
