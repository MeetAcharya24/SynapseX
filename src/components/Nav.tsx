"use client";

import { useEffect, useRef, useState } from "react";
import Magnetic from "./Magnetic";

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 120);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-hair bg-[color:var(--color-bg)]/80 backdrop-blur transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10 lg:px-16">
        <span className="font-display text-lg tracking-tight">SynapseX</span>
        <nav className="hidden gap-8 font-mono text-sm text-dim sm:flex">
          <a href="#features" className="link-underline hover:text-accent">
            Features
          </a>
          <a href="#" className="link-underline hover:text-accent">
            Docs
          </a>
        </nav>
        <Magnetic strength={0.2}>
          <a
            href="https://github.com/MeetAcharya24/SynapseX"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border-hair px-5 py-2 text-sm font-medium transition-colors hover:border-[color:var(--color-accent-line)]"
          >
            GitHub
          </a>
        </Magnetic>
      </div>
    </header>
  );
}
