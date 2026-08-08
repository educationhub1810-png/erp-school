"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SplitHeading } from "./split-heading";

export type HeroSlide = {
  eyebrow: string;
  heading: string;
  body: string;
  primaryCta?: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: { src: string; alt: string; unoptimized?: boolean };
  /** "mac" wraps the image in a macOS browser-window frame (traffic-light
   * dots + url bar), image shown in full (object-contain, never cropped).
   * Omit for a plain white card with the image shown in full. */
  frame?: "mac";
  /** URL text shown in the "mac" frame's address bar. */
  frameLabel?: string;
};

// Centered headline/CTA block on top, a single wide showcase panel below —
// the carousel lives entirely in that panel, cycling both the visual and
// its own small per-slide caption, rather than splitting text/image side by
// side per slide.
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 -top-40 w-[50rem] h-[50rem] rounded-full bg-[#00A5FD]/15 blur-3xl animate-blob-1" />
        <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#035BD8]/10 blur-2xl animate-blob-2" />
        <div className="absolute -bottom-32 -right-24 w-[24rem] h-[24rem] rounded-full bg-[#151E3D]/5 blur-2xl animate-blob-3" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-10 text-center">
        <div key={`text-${index}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-[#035BD8] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#035BD8]" />
            {slide.eyebrow}
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-950 leading-[1.05] tracking-tight mb-6">
            {slide.heading}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto mb-8">{slide.body}</p>
          <div className="flex items-center justify-center gap-3">
            {slide.primaryCta && (
              <a href={slide.primaryCta.href} target="_blank" rel="noopener noreferrer">
                <Button className="rounded-full bg-gray-950 hover:bg-gray-800 text-white font-mono text-[11px] tracking-[0.15em] px-6 py-5">
                  {slide.primaryCta.label}
                </Button>
              </a>
            )}
            <a href={slide.secondaryCta.href}>
              <Button variant="outline" className="rounded-full font-mono text-[11px] tracking-[0.15em] px-6 py-5">
                {slide.secondaryCta.label}
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Wide showcase panel — the whole point of the redesign: one large,
          centered stage for the visual, instead of a small side-column card. */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="relative">
          {slide.frame === "mac" ? (
            <div className="relative h-[300px] sm:h-[420px] lg:h-[560px] rounded-2xl overflow-hidden bg-white shadow-2xl shadow-gray-900/10 ring-1 ring-gray-200">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                {slide.frameLabel && (
                  <span className="ml-2 text-[11px] font-mono text-gray-400">{slide.frameLabel}</span>
                )}
              </div>
              <div className="relative w-full h-[calc(100%-41px)] bg-white">
                <div key={`visual-${index}`} className="absolute inset-0 animate-in fade-in duration-500">
                  <Image
                    src={slide.image.src}
                    alt={slide.image.alt}
                    fill
                    unoptimized={slide.image.unoptimized}
                    className="object-contain"
                    priority={index === 0}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-[300px] sm:h-[420px] lg:h-[560px] rounded-[2rem] overflow-hidden bg-white ring-1 ring-[#035BD8]/15 shadow-2xl shadow-[#035BD8]/20">
              <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-[#00A5FD]/10 to-[#035BD8]/10 blur-2xl" />
              <div key={`visual-${index}`} className="absolute inset-0 animate-in fade-in duration-500">
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  fill
                  unoptimized={slide.image.unoptimized}
                  className="object-contain"
                  priority={index === 0}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="hidden sm:flex absolute -left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white ring-1 ring-gray-200 shadow-lg items-center justify-center text-gray-600 hover:bg-gray-950 hover:text-white transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next slide"
            className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white ring-1 ring-gray-200 shadow-lg items-center justify-center text-gray-600 hover:bg-gray-950 hover:text-white transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center gap-2 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-[#035BD8]" : "w-1.5 bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
