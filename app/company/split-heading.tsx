"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";

// Word-by-word "clip and rise" reveal — each word sits in an overflow-hidden
// mask and slides up into place with a staggered delay, instead of the whole
// heading just fading in. Triggered once via IntersectionObserver.
export function SplitHeading({
  children,
  as: Tag = "h2",
  className = "",
  delay = 0,
}: {
  children: string;
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const words = children.split(" ");
  const TagAny = Tag as ElementType<{ ref?: typeof ref; className?: string; children?: React.ReactNode }>;

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
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <TagAny ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden align-top pb-[0.15em] -mb-[0.15em]">
            <span
              className="inline-block transition-transform duration-[900ms] will-change-transform"
              style={{
                transform: visible ? "translateY(0%)" : "translateY(115%)",
                transitionDelay: `${delay + i * 55}ms`,
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </TagAny>
  );
}
