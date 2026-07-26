"use client";

import { useEffect, useRef, useState } from "react";

// Counts up from 0 to `value` once the stat scrolls into view. `suffix`
// (e.g. "%", "+") stays static — only the digits animate.
export function StatCounter({
  value,
  suffix = "",
  prefix = "",
  label,
  numberClassName = "text-white",
  labelClassName = "text-gray-400",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  numberClassName?: string;
  labelClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(eased * value));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className={`font-mono text-3xl sm:text-4xl font-bold tabular-nums ${numberClassName}`}>
        {prefix}
        {display}
        {suffix}
      </p>
      <p className={`mt-1.5 text-[11px] font-mono tracking-[0.15em] ${labelClassName}`}>{label}</p>
    </div>
  );
}
