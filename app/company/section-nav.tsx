"use client";

import { useEffect, useState } from "react";

// Numbered section nav (01/02/03/04) — structural pattern borrowed from
// editorial studio sites: a small mono index next to each label, with the
// current in-view section highlighted via IntersectionObserver as the user
// scrolls. Copy, layout and visuals below are KreTech's own.
const SECTIONS = [
  { id: "intro", num: "01", label: "INTRO" },
  { id: "work", num: "02", label: "WORK" },
  { id: "process", num: "03", label: "PROCESS" },
  { id: "contact", num: "04", label: "CONTACT" },
];

export function SectionNav() {
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
    <nav className="hidden sm:flex items-center gap-1 font-mono text-[11px] font-medium tracking-[0.15em]">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            active === s.id ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-950"
          }`}
        >
          <span className={active === s.id ? "text-indigo-200" : "text-gray-300"}>{s.num}</span> {s.label}
        </a>
      ))}
    </nav>
  );
}
