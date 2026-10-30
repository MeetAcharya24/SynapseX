"use client";

import { useRef, type ReactElement, cloneElement } from "react";

export default function Magnetic({
  children,
  strength = 0.35,
}: {
  children: ReactElement<React.HTMLAttributes<HTMLElement>>;
  strength?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
  }

  return cloneElement(children, {
    ref,
    onMouseMove,
    onMouseLeave,
    style: {
      ...(children.props.style || {}),
      transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
      display: "inline-block",
    },
  } as Partial<React.HTMLAttributes<HTMLElement>>);
}
