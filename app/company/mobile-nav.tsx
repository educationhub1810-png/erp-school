"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { id: "intro", label: "Intro" },
  { id: "work", label: "Work" },
  { id: "process", label: "Process" },
  { id: "contact", label: "Contact" },
];

// Small-screen fallback for SectionNav, which is desktop-only (hidden sm:flex).
export function MobileNav({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          dark ? "text-gray-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-44 rounded-2xl bg-white ring-1 ring-gray-100 shadow-xl shadow-gray-900/10 p-2 flex flex-col">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-950 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
