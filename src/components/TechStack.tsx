"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stack = [
  "Next.js",
  "LangGraph",
  "OpenAI",
  "Claude",
  "Gemini",
  "MCP",
  "Docker",
  "Redis",
  "PostgreSQL",
];

export default function TechStack() {
  const row = [...stack, ...stack];
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current, {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="border-b border-hair py-16">
      <p className="px-6 text-center font-mono text-xs tracking-[0.25em] text-faint sm:px-10 lg:px-16">
        BUILT ON TOOLS YOU ALREADY TRUST
      </p>

      <div className="relative mt-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
          style={{
            background:
              "linear-gradient(90deg, var(--color-bg), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
          style={{
            background:
              "linear-gradient(270deg, var(--color-bg), transparent)",
          }}
        />
        <div className="marquee flex w-max gap-4">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap rounded-full border-hair bg-elevated px-6 py-3 font-mono text-sm text-dim transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-accent-line)] hover:text-accent"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .marquee {
          animation: marquee 32s linear infinite;
        }
        .marquee:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none; }
        }
      `}</style>
    </section>
  );
}
