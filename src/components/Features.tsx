"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "Visual agent builder",
    desc: "Drag nodes onto a canvas to compose agents, branches, and tool calls — see the graph you're actually shipping.",
    span: "lg:col-span-2 lg:row-span-2",
    icon: (
      <path d="M4 7h4v4H4V7Zm12 6h4v4h-4v-4ZM6 11v4a2 2 0 0 0 2 2h2m2-10h4a2 2 0 0 1 2 2v2" />
    ),
  },
  {
    title: "Swap LLMs mid-flow",
    desc: "Route between OpenAI, Claude, and Gemini per node — no vendor lock-in, no rewrites.",
    span: "",
    icon: <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />,
  },
  {
    title: "Configure tools over MCP",
    desc: "Wire in any MCP-compatible tool and give agents real capabilities, not just text generation.",
    span: "",
    icon: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" />,
  },
  {
    title: "Memory & prompt playground",
    desc: "Test prompts against live memory state before they ever reach production.",
    span: "lg:col-span-2",
    icon: <path d="M12 3a9 9 0 1 0 9 9M12 3v9l6 3" />,
  },
  {
    title: "Deploy with one click",
    desc: "Ship to a Docker container with Redis and Postgres already wired — no YAML spelunking.",
    span: "",
    icon: <path d="M12 2v13m0 0 4-4m-4 4-4-4M5 19h14" />,
  },
];

export default function Features() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-feature-head]", {
        y: 70,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
      gsap.from("[data-card]", {
        y: 80,
        opacity: 0,
        scale: 0.94,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-grid]", start: "top 88%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={root}
      className="border-b border-hair px-6 py-28 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div data-feature-head className="max-w-xl">
          <p className="font-mono text-xs tracking-[0.25em] text-accent">
            CAPABILITIES
          </p>
          <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl text-balance">
            Everything the orchestration layer should have shipped with.
          </h2>
        </div>

        <div
          data-grid
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[220px]"
        >
          {features.map((f) => (
            <div
              key={f.title}
              data-card
              onMouseMove={(e) => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                const px = e.clientX - r.left;
                const py = e.clientY - r.top;
                const rx = ((py / r.height) - 0.5) * -8;
                const ry = ((px / r.width) - 0.5) * 8;
                el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
                el.style.setProperty("--mx", `${px}px`);
                el.style.setProperty("--my", `${py}px`);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  "perspective(700px) rotateX(0) rotateY(0) scale(1)";
              }}
              className={`group relative overflow-hidden rounded-2xl border-hair bg-elevated p-7 transition-[transform,border-color] duration-200 ease-out will-change-transform hover:border-[color:var(--color-accent-line)] ${f.span}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-accent transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:rotate-6 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {f.icon}
              </svg>
              <h3 className="mt-5 font-display text-xl tracking-tight">
                {f.title}
              </h3>
              <p className="mt-3 text-dim">{f.desc}</p>
              <div
                className="pointer-events-none absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-accent-soft)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ left: "var(--mx, 50%)", top: "var(--my, 50%)" }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
