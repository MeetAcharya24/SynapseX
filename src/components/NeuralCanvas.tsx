"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number };
type Pulse = { from: number; to: number; t: number; speed: number };

export default function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };
    const LINK_DIST = 170;
    const MOUSE_RADIUS = 260;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;

    function nodeCount() {
      return Math.max(55, Math.round((w * h) / 26000));
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      nodes = Array.from({ length: nodeCount() }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }));
      pulses = [];
    }

    function maybeSpawnPulse() {
      if (Math.random() > 0.035) return;
      const a = Math.floor(Math.random() * nodes.length);
      const b = Math.floor(Math.random() * nodes.length);
      if (a === b) return;
      const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
      if (d > LINK_DIST) return;
      pulses.push({ from: a, to: b, t: 0, speed: 0.01 + Math.random() * 0.014 });
    }

    function step() {
      ctx!.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_RADIUS && d > 0.01) {
            const f = (1 - d / MOUSE_RADIUS) * 0.9;
            n.x += (dx / d) * f;
            n.y += (dy / d) * f;
          }
        }
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            let alpha = (1 - d / LINK_DIST) * 0.4;
            if (mouse.active) {
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const md = Math.hypot(mx - mouse.x, my - mouse.y);
              if (md < MOUSE_RADIUS) {
                alpha = Math.min(0.9, alpha + (1 - md / MOUSE_RADIUS) * 0.7);
              }
            }
            ctx!.strokeStyle = `rgba(214,255,63,${alpha})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      if (!reduced) {
        maybeSpawnPulse();
        pulses = pulses.filter((p) => p.t <= 1);
        for (const p of pulses) {
          p.t += p.speed;
          const a = nodes[p.from];
          const b = nodes[p.to];
          if (!a || !b) continue;
          const x = a.x + (b.x - a.x) * p.t;
          const y = a.y + (b.y - a.y) * p.t;
          ctx!.fillStyle = "rgba(214,255,63,1)";
          ctx!.shadowColor = "rgba(214,255,63,0.9)";
          ctx!.shadowBlur = 8;
          ctx!.beginPath();
          ctx!.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      }

      for (const n of nodes) {
        let d = Infinity;
        if (mouse.active) d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const near = d < MOUSE_RADIUS;
        ctx!.fillStyle = near
          ? "rgba(214,255,63,0.95)"
          : "rgba(243,243,241,0.75)";
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, near ? 2.6 : 1.9, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(step);
    }

    resize();
    init();
    raf = requestAnimationFrame(step);

    function onResize() {
      resize();
      init();
    }
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 h-screen w-screen"
      aria-hidden="true"
    />
  );
}
