"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { SectionNav } from "./section-nav";

const ISMS_HOME_URL = "https://isms.study";

// Switches to a dark treatment whenever a section marked
// data-header-theme="dark" (the Stats band, Contact, Footer) spans the
// header's height — via IntersectionObserver against a thin band sized to
// the header, same technique as SectionNav's scroll-spy.
export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let observer: IntersectionObserver | null = null;
    const intersecting = new Set<Element>();

    const setup = () => {
      observer?.disconnect();
      intersecting.clear();

      // A 1px detection band positioned right where the header's bottom
      // edge sits — top margin pushes the root's top edge down past the
      // header, bottom margin pulls the bottom edge up to just 1px below
      // that, in real pixels (not %) so the math can't produce an inverted,
      // always-empty rectangle regardless of viewport height.
      const height = Math.round(header.getBoundingClientRect().height);
      const bottomMargin = Math.max(0, window.innerHeight - height - 1);

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) intersecting.add(entry.target);
            else intersecting.delete(entry.target);
          }
          setDark(intersecting.size > 0);
        },
        { rootMargin: `-${height}px 0px -${bottomMargin}px 0px`, threshold: 0 }
      );

      document.querySelectorAll('[data-header-theme="dark"]').forEach((el) => observer!.observe(el));
    };

    setup();
    window.addEventListener("resize", setup);
    return () => {
      window.removeEventListener("resize", setup);
      observer?.disconnect();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-30 w-full backdrop-blur-lg border-b transition-colors duration-300 ${
        dark ? "bg-gray-950/95 border-white/10" : "bg-white/95 border-gray-100"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
        <Image
          src={dark ? "/kretech-logo-white-crop.png" : "/kretech-logo-crop.png"}
          alt="KreTech"
          width={600}
          height={130}
          className="h-7 w-auto"
          priority
        />
        <SectionNav dark={dark} />
        <div className="flex items-center gap-2">
          <a href={ISMS_HOME_URL}>
            <Button
              className={`rounded-lg font-mono text-[11px] tracking-[0.15em] px-4 transition-colors ${
                dark ? "bg-white text-gray-950 hover:bg-gray-200" : "bg-[#035BD8] text-white hover:bg-[#0249ad]"
              }`}
            >
              OPEN ISMS
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
          <MobileNav dark={dark} />
        </div>
      </div>
    </header>
  );
}
