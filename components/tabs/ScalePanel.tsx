"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  humanityPosition,
  kardashevLastUpdated,
  kardashevStages,
  kardashevTransitionVideos,
} from "@/lib/data/kardashev";

// --- Scroll-driven video scrubbing -----------------------------------------
//
// One video per gap between stages (kardashevTransitionVideos), each a
// continuous cinematic zoom from one stage's framing to the next's. Only one
// of the two <video> elements is visible at a time (`visibleIndex`); at rest
// it's paused on the frame matching the current stage, and a wheel/touch/key
// gesture plays it through to the next stage.
//
// Forward (deeper into the scale) just plays the video natively — smooth,
// real decoded playback, sped up via `playbackRate` to fit TRANSITION_MS —
// and an `ended` listener advances the stage when it finishes. Backward has
// no native equivalent: browsers don't support negative playbackRate, so
// going back scrubs `currentTime` by hand instead (see scrubVideo), walking
// it from the end back to the start over the same TRANSITION_MS.
const FALLBACK_DURATION_S = 6.083333;

// How long one stage-to-stage transition takes, regardless of the source
// video's actual length — the first pass just let each ~6s video play at
// its native speed, which read as sluggish for a scroll gesture; a later
// pass overcorrected to 1200ms, which read as too rushed to register as a
// zoom rather than a jump-cut. Forward transitions hit this by raising
// playbackRate; backward transitions hit it directly, since the scrub
// loop's speed is just a duration parameter.
const TRANSITION_MS = 2600;

// The caption swaps to the next/previous stage at the transition's midpoint
// rather than waiting for the video to finish — the text lagging a full
// transition behind the imagery read as broken, not deliberate.
const CAPTION_SWAP_MS = TRANSITION_MS / 2;

// A single wheel event from a trackpad can be a fraction of a "notch"; this
// keeps stray sub-threshold movement from triggering a stage change.
const WHEEL_THRESHOLD = 20;

// Manually walks a paused video's currentTime from `from` to `to` over
// `durationMs`, since HTMLMediaElement has no reverse-playback support.
//
// This is gated on the video's own `seeked` event rather than firing a new
// currentTime assignment every animation frame. Issuing ~60 seeks/second
// queued each one before the decoder had finished the last, and repeatedly
// aborting/restarting a seek mid-decode is what was actually causing the
// "laggy" backward scrub the far-apart keyframes made worse — going all the
// way back from Type III chains two of these scrubs together. Waiting for
// each seek to land before requesting the next means the browser only ever
// does useful decode work; the position requested each step is still based
// on elapsed wall-clock time, so a slower device just takes bigger steps
// rather than falling behind schedule.
//
// `isStale` is checked before every step so an in-flight scrub can be
// abandoned (e.g. the user jumped to a different stage before it finished)
// without it clobbering whatever state came after it.
//
// The very first step (and occasionally others) can land on a currentTime
// the video is already effectively at, which some browsers never fire
// `seeked` for — a fallback timeout advances the scrub anyway if the event
// doesn't arrive quickly, so a single missed event can't stall the whole
// transition.
function scrubVideo(
  videoEl: HTMLVideoElement,
  from: number,
  to: number,
  durationMs: number,
  isStale: () => boolean,
  onDone: () => void,
) {
  const start = performance.now();
  let fallback: ReturnType<typeof setTimeout> | null = null;

  function step() {
    if (fallback !== null) {
      clearTimeout(fallback);
      fallback = null;
    }
    if (isStale()) {
      videoEl.removeEventListener("seeked", step);
      return;
    }
    const t = Math.min(1, (performance.now() - start) / durationMs);
    videoEl.currentTime = from + (to - from) * t;
    if (t >= 1) {
      videoEl.removeEventListener("seeked", step);
      onDone();
      return;
    }
    fallback = setTimeout(step, 50);
  }

  videoEl.addEventListener("seeked", step);
  step();
}

// Where a stage sits "at rest": which video is showing, and at which end of
// it. Stage 0 is transition video 0 at its start; the last stage is the
// final transition video at its end; every stage in between is the *first*
// transition video at its end (equally valid as the next video's start,
// since they're a continuous sequence — this is just the canonical choice
// for a direct jump, e.g. clicking a progress dot).
function restPositionFor(stageIndex: number, durations: readonly [number, number]) {
  if (stageIndex === 0) return { videoIndex: 0 as const, time: 0 };
  if (stageIndex === kardashevStages.length - 1) {
    return { videoIndex: 1 as const, time: durations[1] };
  }
  return { videoIndex: 0 as const, time: durations[0] };
}

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
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-black sm:w-96">
            <Image
              src={stage.posterUrl}
              alt={stage.posterAlt}
              fill
              sizes="(min-width: 640px) 24rem, 100vw"
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
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ScalePanel() {
  const [active, setActive] = useState(0);
  // Which stage's caption/dot is shown — flips at the transition's midpoint,
  // ahead of `active` (which waits for the video to actually finish landing
  // on the new stage; see the comment on advance()).
  const [captionIndex, setCaptionIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState<0 | 1>(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lockedUntil = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const durationsRef = useRef<[number, number]>([FALLBACK_DURATION_S, FALLBACK_DURATION_S]);
  // Bumped on every jump/advance so a stale async callback (a forward
  // video's "ended" event, an in-flight reverse scrub) can tell it's no
  // longer the current transition and bail out instead of stomping on
  // whatever state came after it.
  const tokenRef = useRef(0);

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

  // Returns true when the gesture was consumed (a stage change started). At
  // either end it returns false and leaves the event alone — with the
  // document locked there is nothing to scroll to, so this just avoids
  // pointlessly calling preventDefault. Leaving the panel is always done via
  // the tab bar, which stays visible above it.
  const advance = useCallback(
    (direction: 1 | -1) => {
      const now = Date.now();
      if (now < lockedUntil.current) return true;

      const next = active + direction;
      if (next < 0 || next >= kardashevStages.length) return false;

      const transitionIndex: 0 | 1 = direction === 1 ? (active as 0 | 1) : ((active - 1) as 0 | 1);
      const videoEl = transitionIndex === 0 ? video1Ref.current : video2Ref.current;
      if (!videoEl) return false;

      const duration = durationsRef.current[transitionIndex];

      lockedUntil.current = now + TRANSITION_MS;
      tokenRef.current += 1;
      const myToken = tokenRef.current;
      setVisibleIndex(transitionIndex);

      setTimeout(() => {
        if (tokenRef.current !== myToken) return;
        setCaptionIndex(next);
      }, CAPTION_SWAP_MS);

      if (direction === 1) {
        videoEl.currentTime = 0;
        videoEl.playbackRate = (duration * 1000) / TRANSITION_MS;
        const onEnded = () => {
          videoEl.removeEventListener("ended", onEnded);
          videoEl.playbackRate = 1;
          if (tokenRef.current !== myToken) return;
          setActive(next);
        };
        videoEl.addEventListener("ended", onEnded);
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
        videoEl.currentTime = duration;
        scrubVideo(
          videoEl,
          duration,
          0,
          TRANSITION_MS,
          () => tokenRef.current !== myToken,
          () => setActive(next),
        );
      }

      return true;
    },
    [active],
  );

  // Progress-dot navigation: an instant jump rather than an animated
  // transition, so it also doubles as an escape hatch if a transition ever
  // gets stuck.
  const jumpToStage = useCallback((index: number) => {
    tokenRef.current += 1;
    lockedUntil.current = 0;

    const target = restPositionFor(index, durationsRef.current);
    const videoEl = target.videoIndex === 0 ? video1Ref.current : video2Ref.current;
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = target.time;
    }
    setVisibleIndex(target.videoIndex);
    setActive(index);
    setCaptionIndex(index);
  }, []);

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
      className="fixed inset-0 z-0 overflow-hidden bg-black focus:outline-none"
    >
      {/* The two transition videos, full-bleed and stacked — only one is
          visible at a time. Each is muted/playsInline so `.play()` from a
          user gesture (wheel/touch/key) is never blocked by autoplay
          policy, and `poster` shows the right still instantly before the
          video itself has buffered. */}
      <video
        ref={video1Ref}
        src={kardashevTransitionVideos[0]}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        poster={kardashevStages[0].posterUrl}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) durationsRef.current[0] = d;
        }}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
        style={{ opacity: visibleIndex === 0 ? 1 : 0, pointerEvents: "none" }}
      />
      <video
        ref={video2Ref}
        src={kardashevTransitionVideos[1]}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        poster={kardashevStages[1].posterUrl}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) durationsRef.current[1] = d;
        }}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
        style={{ opacity: visibleIndex === 1 ? 1 : 0, pointerEvents: "none" }}
      />

      {/* Captions + leader lines, one per stage. Keyed off captionIndex, not
          active — see the note on that state for why. */}
      {kardashevStages.map((stage, i) => (
        <StageCaption key={stage.id} stage={stage} visible={i === captionIndex} />
      ))}

      {/* Stage progress dots — also the "you are here" affordance */}
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-3 sm:right-12">
        {kardashevStages.map((stage, i) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => jumpToStage(i)}
            aria-label={`Show Type ${stage.type} — ${stage.title}`}
            aria-current={i === captionIndex}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === captionIndex ? "bg-white" : "bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Scroll hint, fades out once the user has moved at all */}
      <div
        className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/40 transition-opacity duration-500 ${
          captionIndex === 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        Scroll to zoom out
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
