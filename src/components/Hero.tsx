"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Magnetic from "./Magnetic";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(content.current, {
        opacity: 0,
        y: -60,
        scale: 0.97,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.9 },
      });
      tl.from("[data-hero-label]", { y: 16, opacity: 0 })
        .from(
          "[data-hero-line]",
          { y: 40, opacity: 0, stagger: 0.12, duration: 1.1 },
          "-=0.5"
        )
        .from(
          "[data-hero-sub]",
          { y: 16, opacity: 0 },
          "-=0.6"
        )
        .from(
          "[data-hero-cta]",
          { y: 16, opacity: 0, stagger: 0.08 },
          "-=0.6"
        )
        .from(
          "[data-hero-stat]",
          { opacity: 0, stagger: 0.08 },
          "-=0.5"
        );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[92vh] flex-col justify-center border-b border-hair px-6 pt-24 pb-16 sm:px-10 lg:px-16"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 38% at 28% 42%, var(--color-bg) 0%, transparent 70%)",
        }}
      />

      <div ref={content} className="relative z-10 mx-auto w-full max-w-5xl">
        <p
          data-hero-label
          className="font-mono text-xs tracking-[0.25em] text-accent"
        >
          OPEN SOURCE &middot; AGENT ORCHESTRATION
        </p>

        <h1 className="mt-6 font-display text-[13vw] leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl text-balance">
          <span data-hero-line className="block overflow-hidden">
            Connected
          </span>
          <span data-hero-line className="block overflow-hidden text-dim">
            intelligence.
          </span>
        </h1>

        <p
          data-hero-sub
          className="mt-8 max-w-xl text-lg text-dim sm:text-xl"
        >
          SynapseX is a visual builder for multi-agent AI systems — compose
          agents, swap models mid-flow, wire up tools over MCP, and deploy,
          without hand-rolling orchestration code.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Magnetic>
            <Link
              data-hero-cta
              href="/studio"
              className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-7 py-3 font-medium text-black"
            >
              Launch Studio
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </Magnetic>
          <Magnetic strength={0.25}>
            <a
              data-hero-cta
              href="https://github.com/MeetAcharya24/SynapseX"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-hair px-7 py-3 font-medium text-text transition-colors hover:border-[color:var(--color-accent-line)]"
            >
              View on GitHub
            </a>
          </Magnetic>
          <Magnetic strength={0.25}>
            <a
              data-hero-cta
              href="#features"
              className="rounded-full border-hair px-7 py-3 font-medium text-text transition-colors hover:border-[color:var(--color-accent-line)]"
            >
              See how it works
            </a>
          </Magnetic>
        </div>

        <div className="mt-16 flex flex-wrap gap-x-10 gap-y-4 font-mono text-xs text-faint">
          <span data-hero-stat>MIT LICENSED</span>
          <span data-hero-stat>NEXT.JS &middot; LANGGRAPH &middot; MCP</span>
          <span data-hero-stat>DOCKER-READY</span>
          <span data-hero-stat>BRING YOUR OWN API KEY</span>
        </div>
      </div>
    </section>
  );
}
