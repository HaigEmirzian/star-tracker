"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number; // 0..1 normalized position
  y: number;
  radius: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const LAYER_CONFIG = [
  { count: 220, radiusRange: [0.4, 0.9], alpha: 0.55 },
  { count: 120, radiusRange: [0.8, 1.4], alpha: 0.8 },
  { count: 60, radiusRange: [1.2, 2.0], alpha: 1 },
] as const;

function buildStars(): Star[] {
  const stars: Star[] = [];
  for (const config of LAYER_CONFIG) {
    for (let i = 0; i < config.count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius:
          config.radiusRange[0] +
          Math.random() * (config.radiusRange[1] - config.radiusRange[0]),
        alpha: config.alpha,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.3 + Math.random() * 0.7,
      });
    }
  }
  return stars;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const stars = buildStars();
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    resize();
    window.addEventListener("resize", resize);

    let rafId: number;
    let t = 0;

    function frame() {
      if (!canvas || !ctx) return;
      t += 1 / 60;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = reduceMotion
          ? 0.85
          : 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);

        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-black"
    />
  );
}
