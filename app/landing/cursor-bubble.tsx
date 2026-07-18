"use client";

import { useEffect, useRef } from "react";

// A soft glass bubble that trails the pointer across the whole page — purely
// decorative, so it's inert to clicks/taps and skipped for reduced-motion.
export function CursorBubble() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 48}px, ${e.clientY - 48}px)`;
      el.style.opacity = "1";
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="motion-reduce:hidden hidden sm:block pointer-events-none fixed top-0 left-0 z-0 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400/50 to-blue-400/20 ring-1 ring-white/70 shadow-lg shadow-indigo-500/30 backdrop-blur-sm opacity-0 transition-[transform,opacity] duration-300 ease-out"
    />
  );
}
