"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Magnetic from "./Magnetic";

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-cta-el]", {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="border-b border-hair px-6 py-32 text-center sm:px-10 lg:px-16"
    >
      <p data-cta-el className="font-mono text-xs tracking-[0.25em] text-accent">
        GET STARTED
      </p>
      <h2 data-cta-el className="mx-auto mt-6 max-w-2xl font-display text-4xl tracking-tight sm:text-6xl text-balance">
        Your first agent, running in minutes.
      </h2>

      <div
        data-cta-el
        className="mx-auto mt-10 w-full max-w-md rounded-xl border-hair bg-elevated px-6 py-4 text-left font-mono text-sm text-dim"
      >
        <span className="text-accent">$</span> npx create-synapsex-app my-agent
        <span className="cursor-blink text-accent">▌</span>
      </div>

      <p data-cta-el className="mt-5 text-sm text-faint">
        Free and open source. Works with your own OpenAI, Claude, or Gemini
        API key — no subscription, no usage markup.
      </p>

      <div data-cta-el className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Magnetic>
          <a
            href="#"
            className="rounded-full bg-[color:var(--color-accent)] px-7 py-3 font-medium text-black"
          >
            View on GitHub
          </a>
        </Magnetic>
        <Magnetic strength={0.25}>
          <a
            href="#"
            className="rounded-full border-hair px-7 py-3 font-medium text-text transition-colors hover:border-[color:var(--color-accent-line)]"
          >
            Read the docs
          </a>
        </Magnetic>
      </div>
    </section>
  );
}
