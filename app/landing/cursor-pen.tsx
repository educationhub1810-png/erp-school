"use client";

import { useEffect, useRef } from "react";
import { PenLine } from "lucide-react";

// A little pen that trails the pointer across the whole page — purely
// decorative, so it's inert to clicks/taps and skipped for reduced-motion.
export function CursorPen() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px, ${e.clientY - 28}px) rotate(-45deg)`;
      el.style.opacity = "1";
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="motion-reduce:hidden hidden sm:block pointer-events-none fixed top-0 left-0 z-40 opacity-0 transition-[transform,opacity] duration-300 ease-out"
    >
      <PenLine className="w-7 h-7 text-indigo-600 drop-shadow-md" />
    </div>
  );
}
