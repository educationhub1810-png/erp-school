"use client";

import { useEffect, useState } from "react";

// Plain text section nav — current in-view section highlighted via
// IntersectionObserver as the user scrolls.
const SECTIONS = [
  { id: "intro", label: "Home" },
  { id: "industries", label: "Industries" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

export function SectionNav({ dark = false }: { dark?: boolean }) {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="hidden lg:flex items-center gap-5 text-[12px] font-semibold tracking-wide uppercase">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`relative py-1.5 transition-colors after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:transition-transform after:duration-300 ${
            active === s.id
              ? dark
                ? "text-white after:bg-[#00A5FD] after:scale-x-100"
                : "text-gray-950 after:bg-[#035BD8] after:scale-x-100"
              : dark
                ? "text-gray-400 hover:text-white after:bg-white after:scale-x-0 hover:after:scale-x-100"
                : "text-gray-500 hover:text-gray-950 after:bg-gray-950 after:scale-x-0 hover:after:scale-x-100"
          }`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
