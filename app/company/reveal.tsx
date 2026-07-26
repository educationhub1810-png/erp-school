"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Fades + slides a section in the first time it scrolls into view. Class
// toggle driven by IntersectionObserver rather than a CSS keyframe, so
// content above the fold never "waits" for an animation to read.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 will-change-transform ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}
