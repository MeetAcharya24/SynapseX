"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SmoothScroll from "./SmoothScroll";
import CursorGlow from "./CursorGlow";
import ScrollProgress from "./ScrollProgress";
import NeuralCanvas from "./NeuralCanvas";

export default function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio");

  if (isStudio) {
    // The builder owns its own scroll/zoom behavior (React Flow) — the
    // marketing site's Lenis smooth-scroll and decorative canvas would
    // otherwise fight with node-canvas panning and zoom.
    return <>{children}</>;
  }

  return (
    <div className="relative z-0">
      <NeuralCanvas />
      <div className="relative z-10">
        <CursorGlow />
        <ScrollProgress />
        <SmoothScroll>{children}</SmoothScroll>
      </div>
    </div>
  );
}
