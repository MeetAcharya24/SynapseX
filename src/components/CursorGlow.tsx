"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isTouch || !dot.current) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let visible = false;

    function onMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        dot.current!.style.opacity = "1";
      }
    }
    function onLeave() {
      visible = false;
      dot.current!.style.opacity = "0";
    }

    function tick() {
      x += (tx - x) * 0.15;
      y += (ty - y) * 0.15;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-300 mix-blend-screen"
      style={{
        background:
          "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
        filter: "blur(2px)",
      }}
    />
  );
}
