"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavLink = { href: string; label: string };

// Hamburger + dropdown panel for the nav links on small screens, where the
// horizontal link row is hidden. The desktop nav/buttons live in landing-page.tsx.
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-2 rounded-2xl bg-white/95 backdrop-blur-lg ring-1 ring-gray-100 shadow-lg shadow-gray-900/10 p-2 flex flex-col">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
