"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive "ecosystem" background — global, behind every page:
 *   • halftone dot fields in the corners (distance falloff)
 *   • circuit-board traces with glowing data pulses travelling along them
 *   • a drifting particle network whose nodes light up and lean toward the pointer
 * Colours come from the theme tokens (auto light/dark). Static layers (halftone +
 * circuit lines) are pre-rendered offscreen; only pulses + particles animate.
 * `calm` (app/dashboard routes) dims every accent for readability, live on nav.
 * Pauses when the tab is hidden and respects prefers-reduced-motion.
 */
type Pt = { x: number; y: number; vx: number; vy: number; r: number };
type Circuit = { pts: Array<[number, number]>; seg: number[]; len: number; pulse: number; speed: number };

const NORM_CIRCUITS: Array<Array<[number, number]>> = [
  [[0.0, 0.16], [0.09, 0.16], [0.09, 0.27], [0.17, 0.27], [0.17, 0.38], [0.25, 0.38]],
  [[0.0, 0.6], [0.06, 0.6], [0.06, 0.71], [0.13, 0.71], [0.13, 0.82], [0.2, 0.82]],
  [[1.0, 0.14], [0.91, 0.14], [0.91, 0.25], [0.83, 0.25], [0.83, 0.36], [0.75, 0.36]],
  [[1.0, 0.52], [0.93, 0.52], [0.93, 0.63], [0.86, 0.63], [0.86, 0.74], [0.8, 0.74]],
  [[0.48, 0.0], [0.48, 0.07], [0.4, 0.07], [0.4, 0.14]],
  [[0.6, 1.0], [0.6, 0.93], [0.68, 0.93], [0.68, 0.85]],
  [[0.3, 1.0], [0.3, 0.91], [0.22, 0.91], [0.22, 0.83]],
];

export function EcosystemBackground({ calm = false }: { calm?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calmRef = useRef(calm);
  const decoRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const m = () => (calmRef.current ? 0.45 : 1); // intensity multiplier

    let cA = "#1fc8ff", cB = "#b84dff";
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      cA = (cs.getPropertyValue("--accent") || "#1fc8ff").trim();
      cB = (cs.getPropertyValue("--accent2") || "#b84dff").trim();
    };
    readColors();

    const rgba = (hex: string, a: number) => {
      let c = hex.replace("#", "").trim();
      if (c.length === 3) c = c.split("").map((x) => x + x).join("");
      const r = parseInt(c.slice(0, 2), 16) || 31;
      const g = parseInt(c.slice(2, 4), 16) || 200;
      const b = parseInt(c.slice(4, 6), 16) || 255;
      return `rgba(${r},${g},${b},${a})`;
    };

    let pts: Pt[] = [];
    let circuits: Circuit[] = [];

    const deco = document.createElement("canvas");
    const dctx = deco.getContext("2d");

    const pointAt = (c: Circuit, dist: number): [number, number] => {
      let d = ((dist % c.len) + c.len) % c.len;
      for (let i = 0; i < c.seg.length; i++) {
        if (d <= c.seg[i]) {
          const t = c.seg[i] === 0 ? 0 : d / c.seg[i];
          const a = c.pts[i], b = c.pts[i + 1];
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }
        d -= c.seg[i];
      }
      return c.pts[c.pts.length - 1];
    };

    const buildCircuits = () => {
      circuits = NORM_CIRCUITS.map((np) => {
        const p = np.map(([nx, ny]) => [nx * w, ny * h] as [number, number]);
        const seg: number[] = [];
        let len = 0;
        for (let i = 1; i < p.length; i++) {
          const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
          seg.push(d);
          len += d;
        }
        return { pts: p, seg, len, pulse: Math.random() * len, speed: 0.7 + Math.random() * 0.7 };
      });
    };

    const renderDeco = () => {
      if (!dctx) return;
      deco.width = Math.max(1, Math.floor(w * dpr));
      deco.height = Math.max(1, Math.floor(h * dpr));
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.clearRect(0, 0, w, h);
      const mm = m();

      const corners = [
        { cx: 0, cy: h, rx: w * 0.34, ry: h * 0.62 },
        { cx: 0, cy: 0, rx: w * 0.22, ry: h * 0.38 },
        { cx: w, cy: h, rx: w * 0.28, ry: h * 0.46 },
        { cx: w, cy: 0, rx: w * 0.22, ry: h * 0.36 },
      ];
      const step = 13;
      for (const { cx, cy, rx, ry } of corners) {
        for (let x = 0; x < w; x += step) {
          for (let y = 0; y < h; y += step) {
            const nx = (x - cx) / rx, ny = (y - cy) / ry;
            const dd = Math.hypot(nx, ny);
            if (dd > 1) continue;
            const f = 1 - dd;
            dctx.beginPath();
            dctx.arc(x, y, f * 1.9 + 0.2, 0, Math.PI * 2);
            dctx.fillStyle = rgba(cA, f * 0.3 * mm);
            dctx.fill();
          }
        }
      }

      for (const c of circuits) {
        dctx.strokeStyle = rgba(cA, 0.3 * mm);
        dctx.lineWidth = 1;
        dctx.beginPath();
        dctx.moveTo(c.pts[0][0], c.pts[0][1]);
        for (let i = 1; i < c.pts.length; i++) dctx.lineTo(c.pts[i][0], c.pts[i][1]);
        dctx.stroke();
        for (const [x, y] of c.pts) {
          dctx.beginPath();
          dctx.arc(x, y, 2.2, 0, Math.PI * 2);
          dctx.fillStyle = rgba(cA, 0.55 * mm);
          dctx.fill();
        }
      }
    };
    decoRef.current = renderDeco;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.max(44, Math.floor((w * h) / 11000)));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.34, vy: (Math.random() - 0.5) * 0.34,
        r: Math.random() * 1.7 + 0.8,
      }));
      buildCircuits();
      renderDeco();
    };
    resize();

    const LINK = 146, MOUSE = 200;
    const draw = () => {
      const mm = m();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(deco, 0, 0, w, h);

      ctx.shadowBlur = 9;
      for (const c of circuits) {
        c.pulse += c.speed;
        const [px, py] = pointAt(c, c.pulse);
        ctx.shadowColor = rgba(cB, 0.9 * mm);
        ctx.fillStyle = rgba(cB, 0.95 * mm);
        ctx.beginPath();
        ctx.arc(px, py, calmRef.current ? 1.7 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            const t = 1 - d / LINK;
            ctx.strokeStyle = rgba(cA, t * 0.25 * mm);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const mdx = a.x - mouse.x, mdy = a.y - mouse.y, md = Math.hypot(mdx, mdy);
        if (md < MOUSE) {
          const t = 1 - md / MOUSE;
          ctx.strokeStyle = rgba(cB, t * 0.55 * mm);
          ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          a.x -= mdx * 0.0009 * t; a.y -= mdy * 0.0009 * t;
        }
      }

      ctx.shadowBlur = 6;
      for (const p of pts) {
        ctx.shadowColor = rgba(cA, 0.9 * mm);
        ctx.fillStyle = rgba(cA, 0.95 * mm);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    const staticFrame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(deco, 0, 0, w, h);
      for (const p of pts) {
        ctx.fillStyle = rgba(cA, 0.9 * m());
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    if (reduce) staticFrame();
    else start();

    const applyColors = () => { readColors(); renderDeco(); if (reduce) staticFrame(); };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) { mouse.x = x; mouse.y = y; }
      else { mouse.x = -9999; mouse.y = -9999; }
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) start();
    };

    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const mo = new MutationObserver(applyColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", applyColors);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      decoRef.current = null;
      ro.disconnect(); mo.disconnect();
      mq.removeEventListener?.("change", applyColors);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // React to route (calm) changes without re-initialising the animation.
  useEffect(() => {
    calmRef.current = calm;
    decoRef.current?.();
  }, [calm]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
