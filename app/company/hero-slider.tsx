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
};

// Two-slide hero carousel — soft blob backdrop + split content/visual layout,
// with prev/next arrows cycling between the company intro and the product.
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-[#00A5FD]/15 blur-2xl animate-blob-1" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#035BD8]/10 blur-2xl animate-blob-2" />
      </div>

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 items-center">
        <div key={`text-${index}`} className="animate-in fade-in slide-in-from-left-6 duration-500 px-4 sm:px-6 py-16 sm:py-24">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[#035BD8] mb-5 block">
            {slide.eyebrow}
          </span>
          <SplitHeading as="h1" className="text-4xl sm:text-5xl font-bold text-gray-950 leading-[1.05] tracking-tight mb-6 max-w-md">
            {slide.heading}
          </SplitHeading>
          <p className="text-base text-gray-500 max-w-md mb-8">{slide.body}</p>
          <div className="flex items-center gap-3">
            {slide.primaryCta && (
              <a href={slide.primaryCta.href}>
                <Button className="rounded-full bg-gray-950 hover:bg-gray-800 text-white font-mono text-[11px] tracking-[0.15em] px-5">
                  {slide.primaryCta.label}
                </Button>
              </a>
            )}
            <a href={slide.secondaryCta.href}>
              <Button variant="outline" className="rounded-full font-mono text-[11px] tracking-[0.15em] px-5">
                {slide.secondaryCta.label}
              </Button>
            </a>
          </div>
        </div>

        {/* Visual sits as an inset, rounded card — padding on every side so
            the page background shows around it, rather than a full-bleed
            edge-to-edge panel. Same fixed box for every slide so switching
            slides never resizes the layout. */}
        <div className="p-6 sm:p-10 lg:pr-0">
          <div className="relative h-[280px] sm:h-[380px] lg:h-[500px] rounded-3xl overflow-hidden bg-white shadow-xl shadow-gray-900/5">
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
      </div>

      <button
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="hidden sm:flex absolute left-3 top-[46%] -translate-y-1/2 w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 shadow-md items-center justify-center text-gray-600 hover:bg-gray-950 hover:text-white transition-colors z-10"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next slide"
        className="hidden sm:flex absolute right-3 top-[46%] -translate-y-1/2 w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 shadow-md items-center justify-center text-gray-600 hover:bg-gray-950 hover:text-white transition-colors z-10"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="relative flex items-center justify-center gap-2 pb-10">
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
  );
}
