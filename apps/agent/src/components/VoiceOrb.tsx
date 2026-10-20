"use client";

import React, { useRef, useEffect, useState } from "react";

/**
 * SiriWave voice orb — ported from the upstream platform's WaveAvatar, recolored to the Unskinned
 * palette (navy globe + amber waves) and rewritten dependency-free (no
 * framer-motion). Shows a flat line when idle and animated sine waves when the
 * advisor is speaking.
 */
const WAVES = [
  { timeModifier: 4, lineWidth: 2, amplitude: 25, wavelength: 25 },
  { timeModifier: 2, lineWidth: 2, amplitude: 10, wavelength: 30 },
  { timeModifier: 1, lineWidth: 2, amplitude: 30, wavelength: 30 },
  { timeModifier: 3, lineWidth: 2, amplitude: 40, wavelength: 40 },
  { timeModifier: 0.5, lineWidth: 2, amplitude: 60, wavelength: 60 },
  { timeModifier: 1.3, lineWidth: 2, amplitude: 40, wavelength: 40 },
];

/**
 * `size` is a MAXIMUM, not a fixed width. The orb shrinks to whatever the column
 * gives it — a fixed 200px overflowed the card on 320px-wide phones — and the
 * canvas is re-rasterised at the measured size so it stays crisp.
 */
export function VoiceOrb({ isSpeaking = false, size = 220 }: { isSpeaking?: boolean; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(size);
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  // Track the container width. Browsers without ResizeObserver keep the maximum
  // size, which still fits every layout at or above the `sm` breakpoint.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setPx(Math.max(96, Math.min(size, Math.round(box.clientWidth))));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Canvas cannot read CSS variables, so resolve the brand accent from the
    // document and let the orb follow the light/dark theme.
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#1e6bff";
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    canvas.style.width = `${px}px`;
    canvas.style.height = `${px}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Amber wave gradient (Unskinned brand) with a teal accent at the tail.
    const waveGrad = ctx.createLinearGradient(0, 0, px, 0);
    waveGrad.addColorStop(0, "rgba(245,158,11,0.45)");
    waveGrad.addColorStop(0.5, accent);
    waveGrad.addColorStop(1, "rgba(52,211,153,0.45)");

    const r = px / 2 - 5;
    let raf = 0;

    const draw = () => {
      const w = px, h = px, speaking = speakingRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.clip();

      // Navy globe (Unskinned dark theme).
      const globe = ctx.createRadialGradient(w / 2, h / 2, r * 0.2, w / 2, h / 2, r);
      globe.addColorStop(0, "rgba(20,32,58,0.96)");
      globe.addColorStop(0.5, "rgba(16,26,48,0.98)");
      globe.addColorStop(1, "rgba(8,15,30,0.99)");
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = globe;
      ctx.fill();

      if (!speaking) {
        ctx.beginPath();
        ctx.moveTo(w * 0.13, h / 2);
        ctx.lineTo(w * 0.87, h / 2);
        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }

      const now = Date.now() / 800;
      for (const wave of WAVES) {
        ctx.beginPath();
        for (let x = w * 0.13; x <= w * 0.87; x += 1) {
          const y =
            h / 2 +
            Math.sin(x / wave.wavelength + now * wave.timeModifier) *
              wave.amplitude *
              Math.sin((Math.PI * (x - w * 0.13)) / (w * 0.87 - w * 0.13));
          if (x === w * 0.13) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = wave.lineWidth;
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = "#fcd34d";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [px]);

  return (
    <div
      ref={boxRef}
      // Purely decorative: the connection state is announced through the live
      // region in VoiceAdvisor, so screen readers should skip the canvas.
      aria-hidden="true"
      style={{
        // Never wider than the column, never wider than the requested maximum.
        width: "100%",
        maxWidth: size,
        aspectRatio: "1 / 1",
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(to bottom, #0b1220, #080f1e)",
        boxShadow: "0 6px 32px var(--aura-faint), 0 0 0 1px var(--hairline)",
        margin: "0 auto",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
