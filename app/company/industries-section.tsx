import {
  ArrowRight,
  Building2,
  DollarSign,
  Factory,
  Film,
  GraduationCap,
  HeartPulse,
  Plane,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

const INDUSTRIES = [
  {
    icon: HeartPulse,
    name: "Healthcare",
    desc: "HIPAA-compliant platforms, patient management, and telemedicine solutions.",
  },
  {
    icon: DollarSign,
    name: "Finance & Banking",
    desc: "Secure fintech systems — payments, fraud detection, and compliance.",
  },
  {
    icon: ShoppingCart,
    name: "E-commerce & Retail",
    desc: "High-performance storefronts and customer experience platforms.",
  },
  {
    icon: GraduationCap,
    name: "Education",
    desc: "LMS platforms, school ERPs, and digital classroom tools.",
  },
  {
    icon: Building2,
    name: "Real Estate",
    desc: "Property management, virtual tours, and CRM systems.",
  },
  {
    icon: Factory,
    name: "Manufacturing & Logistics",
    desc: "Supply chain visibility and IoT-enabled tracking.",
  },
  {
    icon: Plane,
    name: "Travel & Hospitality",
    desc: "Booking engines and guest experience platforms built to scale.",
  },
  {
    icon: Film,
    name: "Media & Entertainment",
    desc: "Streaming platforms and audience engagement tools.",
  },
];

// Brand gradient — cyan -> blue -> navy, pulled from the KreTech logo —
// used on the heading accent and every icon tile for consistency.
const BRAND_GRADIENT = "bg-gradient-to-br from-[#00A5FD] via-[#035BD8] to-[#151E3D]";

export function IndustriesSection() {
  return (
    <section id="industries" className="bg-[#F5F8FC] py-20 sm:py-28 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-[2px] bg-[#035BD8]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#035BD8]">
              INDUSTRIES WE SERVE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 leading-tight mb-4">
            Solutions built for{" "}
            <span className="bg-gradient-to-r from-[#00A5FD] to-[#035BD8] bg-clip-text text-transparent">
              every industry
            </span>
          </h2>
          <p className="text-gray-500 text-lg">
            Whatever domain you operate in, we bring the technical depth and industry
            understanding to build software that actually fits how you work.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 60}>
              <div className="h-full rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-900/5 hover:-translate-y-1 transition-all duration-300 bg-white p-6">
                <div className={`w-12 h-12 rounded-xl ${BRAND_GRADIENT} flex items-center justify-center mb-5 shadow-md shadow-blue-900/10`}>
                  <ind.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{ind.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{ind.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151E3D] to-[#0A3D91] px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#00A5FD]/20 blur-3xl" />
            <div className="relative text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Don&apos;t see your industry?
              </h3>
              <p className="text-gray-300 max-w-md">
                We adapt fast. Tell us what you&apos;re building — chances are we&apos;ve
                solved something like it before.
              </p>
            </div>
            <a href="#contact" className="relative shrink-0">
              <Button className="rounded-full bg-white text-gray-950 hover:bg-gray-100 px-6 py-5">
                Talk to Our Team
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
