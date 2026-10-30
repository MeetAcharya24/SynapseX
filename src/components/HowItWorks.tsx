"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    n: "01",
    title: "Open the canvas",
    desc: "Start a new project and drag your first agent node onto the board.",
  },
  {
    n: "02",
    title: "Pick your model",
    desc: "Attach OpenAI, Claude, or Gemini to that node — swap it later without touching anything downstream.",
  },
  {
    n: "03",
    title: "Wire up tools",
    desc: "Connect real capabilities over MCP — search, a database, an API — so the agent can actually act.",
  },
  {
    n: "04",
    title: "Test in the playground",
    desc: "Run prompts against live memory state before anything reaches production.",
  },
  {
    n: "05",
    title: "Deploy",
    desc: "One click ships it to a container with Redis and Postgres already wired in.",
  },
];

export default function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: () => "+=" + window.innerHeight * (steps.length - 1),
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
        onUpdate: (self) => {
          const idx = Math.min(
            steps.length - 1,
            Math.floor(self.progress * steps.length)
          );
          setActive(idx);
        },
      });
      return () => st.kill();
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-screen flex-col justify-center border-b border-hair px-6 py-20 sm:px-10 lg:px-16"
    >
      <p className="font-mono text-xs tracking-[0.25em] text-accent">
        HOW IT WORKS
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="flex items-baseline gap-4 py-3 transition-opacity duration-300"
              style={{ opacity: active === i ? 1 : 0.3 }}
            >
              <span
                className="font-mono text-sm transition-colors duration-300"
                style={{
                  color:
                    active === i
                      ? "var(--color-accent)"
                      : "var(--color-text-faint)",
                }}
              >
                {s.n}
              </span>
              <span className="font-display text-2xl tracking-tight sm:text-3xl">
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex items-center">
          <div className="rounded-2xl border-hair bg-elevated p-10">
            <span className="font-mono text-xs text-accent">
              {steps[active].n} / {steps.length.toString().padStart(2, "0")}
            </span>
            <p className="mt-4 font-display text-2xl tracking-tight sm:text-3xl text-balance">
              {steps[active].title}
            </p>
            <p className="mt-4 text-lg text-dim">{steps[active].desc}</p>
            <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-border)]">
              <div
                className="h-full rounded-full bg-[color:var(--color-accent)] transition-all duration-300 ease-out"
                style={{
                  width: `${((active + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
