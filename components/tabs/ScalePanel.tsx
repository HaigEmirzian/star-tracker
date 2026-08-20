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
// SCALE_PAST is how large a stage grows once you've moved beyond it;
// SCALE_FUTURE is how small a not-yet-reached stage sits. Both are modest —
// overshooting makes the seam between photos obvious.
const SCALE_PAST = 2.6;
const SCALE_FUTURE = 0.35;

// Wheel/touch input is locked out for this long after a stage change, so one
// physical scroll gesture (which fires many wheel events) advances exactly
// one stage instead of blowing through all three.
const TRANSITION_MS = 900;

// A single wheel event from a trackpad can be a fraction of a "notch"; this
// keeps stray sub-threshold movement from triggering a stage change.
const WHEEL_THRESHOLD = 20;

function stageTransform(index: number, active: number) {
  if (index === active) return { scale: 1, opacity: 1 };
  if (index < active) return { scale: SCALE_PAST, opacity: 0 };
  return { scale: SCALE_FUTURE, opacity: 0 };
}

// Soft edge fade so each image dissolves into the page instead of ending at
// a visible boundary. All three sources are "bright subject on a black
// field" and the page is pure black, so the subjects already blend — what
// gave the frames away was the hard edge (originally a circular clip, then
// the rectangle simply stopping). Earth and the Sun sit in empty space so
// the fade never reaches them; the Milky Way panorama fills its frame edge
// to edge, and is the reason this exists.
//
// Most of these images need no mask at all: they are a bright subject on a
// pure black field, and the panel behind them is pure black, so the frame
// edge is genuinely invisible. Earth and the Sun rely on exactly that. What
// gave the original away was clipping the frame to a circle, not the
// rectangle itself.
//
// The Milky Way panorama is the exception — it is a star field filling the
// frame edge to edge, its background is dark grey rather than black, and its
// rectangle reads clearly against the page. That one gets a fade.
//
// A single elliptical gradient, deliberately NOT two linear gradients
// combined with `mask-composite`: the bottom mask layer composites against
// an empty backdrop, so `intersect` resolves the whole mask to nothing and
// the image disappears. (Adding `WebkitMaskComposite: "source-in"` as
// vendor-prefixing makes it worse — it aliases the standard property and
// wins.) One layer with no compositing has no such failure mode. It tracks
// the real edges because the frame is built to the image's own aspect ratio.
//
// Also deliberately NOT baked into the images as transparency: deriving
// alpha from luminance (the obvious trick for black-background astronomy
// photos) turns Earth's night side and the Milky Way's own dust lanes
// semi-transparent, because those are genuinely dark parts of the subject,
// not background.
const EDGE_FADE_MASK = {
  maskImage: "radial-gradient(ellipse at center, #000 32%, transparent 72%)",
} as const;

/**
 * Thin white leader line running from near the body out to the caption,
 * plus the caption itself. Rendered per stage and only shown while that
 * stage is active.
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
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!visible}
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
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lockedUntil = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

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

  // This panel is a fixed, single-screen experience: one stage fills the
  // viewport and the wheel drives stage changes rather than scrolling. Any
  // page scroll left over (the footer, sub-pixel rounding) is just slack the
  // user can drag into, which reads as a bug. Lock the document while this
  // panel owns the screen, and restore on unmount / tab switch. The
  // reduced-motion path returns early above and never reaches this, so that
  // layout stays scrollable as it needs to be.
  useEffect(() => {
    if (reducedMotion) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [reducedMotion]);

  // Returns true when the gesture was consumed (a stage change happened).
  // At either end it returns false and leaves the event alone — with the
  // document locked there is nothing to scroll to, so this just avoids
  // pointlessly calling preventDefault. Leaving the panel is always done via
  // the tab bar, which stays visible above it.
  const advance = useCallback(
    (direction: 1 | -1) => {
      const now = Date.now();
      if (now < lockedUntil.current) return true;

      const next = active + direction;
      if (next < 0 || next >= kardashevStages.length) return false;

      lockedUntil.current = now + TRANSITION_MS;
      setActive(next);
      return true;
    },
    [active],
  );

  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      const consumed = advance(e.deltaY > 0 ? 1 : -1);
      // Only swallow the scroll while there's still a stage to move to.
      if (consumed) e.preventDefault();
    }

    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    }

    function onTouchMove(e: TouchEvent) {
      const start = touchStartY.current;
      if (start === null) return;
      const delta = start - (e.touches[0]?.clientY ?? start);
      if (Math.abs(delta) < 40) return;
      touchStartY.current = null;
      const consumed = advance(delta > 0 ? 1 : -1);
      if (consumed && e.cancelable) e.preventDefault();
    }

    // passive: false so preventDefault actually suppresses the page scroll.
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [advance, reducedMotion]);

  // Up/Down arrows move between stages when the panel has focus. Left/Right
  // are deliberately untouched — TabSwitcher owns those globally for tab
  // switching.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (advance(1)) e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (advance(-1)) e.preventDefault();
    }
  }

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
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Kardashev scale, scroll to zoom out between stages"
      // Fixed rather than in-flow: this is a single-screen visual, and any
      // attempt to size it against <main>'s padding plus the footer leaves a
      // sliver of page scroll (the earlier `calc(100svh - 10rem)` overshot by
      // ~38px, which read as stray slack the user could drag into). Taking it
      // out of flow means the panel is exactly the viewport by definition,
      // and the flow content behind it collapses to well under one screen, so
      // there is nothing to scroll. The tab bar is lifted to z-10 in
      // TabSwitcher to stay above this.
      //
      // Solid black rather than letting the ambient Starfield through: these
      // images are black-backed, so matching the page to that black is what
      // makes their frames invisible. Showing stars behind them instead makes
      // every rectangle edge legible again.
      className="fixed inset-0 z-0 overflow-hidden bg-black focus:outline-none"
    >
      {/* Layered image stack — all stages occupy the same box; scale/opacity
          decide which one you're looking at. */}
      {kardashevStages.map((stage, i) => {
        const { scale, opacity } = stageTransform(i, active);
        return (
          <div
            key={stage.id}
            className="absolute inset-0 flex items-center justify-center transition-all ease-out"
            style={{
              transform: `scale(${scale})`,
              opacity,
              transitionDuration: `${TRANSITION_MS}ms`,
              // Keeps offscreen stages from eating pointer events.
              pointerEvents: i === active ? "auto" : "none",
            }}
          >
            {/* The frame takes the image's own aspect ratio (minus any
                cropped strip), so the edge-fade mask lands exactly on the
                image's edges rather than on letterbox padding. Because the
                frame matches, object-cover fits exactly and crops nothing.

                overflow-hidden plus an over-tall inner box is what clips the
                burned-in caption off sources that have one (see cropBottom):
                the inner box is scaled up by 1/(1-crop) so the unwanted
                strip falls outside the frame. */}
            <div
              className="relative w-[min(82vmin,82vw)] overflow-hidden"
              style={{
                aspectRatio: `${stage.aspect / (1 - (stage.cropBottom ?? 0))}`,
                ...(stage.fadeEdges ? EDGE_FADE_MASK : null),
              }}
            >
              <div
                className="absolute inset-x-0 top-0"
                style={{ height: `${100 / (1 - (stage.cropBottom ?? 0))}%` }}
              >
                <Image
                  src={stage.imageUrl}
                  alt={stage.imageAlt}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Captions + leader lines, one per stage */}
      {kardashevStages.map((stage, i) => (
        <StageCaption key={stage.id} stage={stage} visible={i === active} />
      ))}

      {/* Stage progress dots — also the "you are here" affordance */}
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-3 sm:right-12">
        {kardashevStages.map((stage, i) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show Type ${stage.type} — ${stage.title}`}
            aria-current={i === active}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === active ? "bg-white" : "bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Scroll hint, fades out once the user has moved at all */}
      <div
        className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/40 transition-opacity duration-500 ${
          active === 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        Scroll to zoom out
      </div>

      {/* Image credit — required for the ESO photo (CC BY 4.0), and NASA asks
          to be acknowledged as the source of its imagery. */}
      <div className="pointer-events-none absolute bottom-6 right-6 text-right text-[10px] leading-relaxed text-white/30 sm:right-12">
        Image: {kardashevStages[active].imageCredit}
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
