import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  IndianRupee,
  Layers,
  Mail,
  MessageSquare,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DemoRequestForm } from "@/app/landing/demo-request-form";
import { Header } from "./header";
import { HeroSlider } from "./hero-slider";
import { IndustriesSection } from "./industries-section";
import { NetworkGraphic } from "./network-graphic";
import { Reveal } from "./reveal";
import { ServicesSection } from "./services-section";
import { SplitHeading } from "./split-heading";
import { StatCounter } from "./stat-counter";

// Cycled across feature tiles so the grid reads as colorful, not a wall of
// repeated brand-indigo squares — matches the treatment on the iSMS landing page.
const ICON_COLORS = [
  "from-[#00A5FD] to-[#035BD8]",
  "from-blue-500 to-blue-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-emerald-500 to-emerald-600",
  "from-rose-500 to-rose-600",
];

// "/" on isms.study is the iSMS marketing page, so links into the product
// go there — visitors log in from there themselves.
const ISMS_HOME_URL = "https://isms.study";

const PRODUCTS = [
  {
    name: "iSMS",
    tagline: "School Management System",
    desc: "One dashboard for admissions, attendance, fees, exams, transport, and everything else a school runs on.",
    href: ISMS_HOME_URL,
    features: [
      { icon: Users, label: "Student & Staff Management", desc: "Admissions, profiles, classes, sections — all in one place." },
      { icon: ClipboardList, label: "Attendance", desc: "Daily student & staff attendance with real-time tracking." },
      { icon: IndianRupee, label: "Fees & Accounting", desc: "Fee structures, collection, receipts and expense tracking." },
      { icon: Video, label: "LMS & Homework", desc: "Course content, assignments and homework submissions." },
      { icon: MessageSquare, label: "Communication", desc: "Announcements and messaging between school and parents." },
      { icon: BarChart3, label: "Reports & Analytics", desc: "Real-time dashboards across every module." },
    ],
  },
];

const CONTACT_EMAIL = "kretech.contact@gmail.com";

export function CompanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero — two-slide carousel over a soft blob backdrop */}
      <section id="intro" className="relative overflow-hidden bg-[#EAF5FF] scroll-mt-24">
        <HeroSlider
          slides={[
            {
              eyebrow: "BUILDING SOFTWARE THAT BUSINESSES RUN ON.",
              heading: "We're KreTech",
              body: "Every product we ship is designed, engineered, and supported by our own team — start to finish, with nothing handed off.",
              secondaryCta: { label: "CONTACT", href: "#contact" },
              image: {
                src: "/side-image.png",
                alt: "KreTech software engineering illustration",
              },
            },
            {
              eyebrow: "OUR FLAGSHIP PRODUCT.",
              heading: "Meet iSMS",
              body: "One dashboard for admissions, attendance, fees, exams, and transport — everything a school runs on, already live in real schools today.",
              primaryCta: { label: "VISIT ISMS", href: ISMS_HOME_URL },
              secondaryCta: { label: "SEE FEATURES", href: "#work" },
              image: {
                src: "/dashboard-screenshot.png",
                alt: "iSMS dashboard",
              },
            },
          ]}
        />
      </section>

      <IndustriesSection />

      {/* Stats band */}
      <section data-header-theme="dark" className="bg-gray-950 border-t border-white/5">
        <Reveal className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatCounter value={100} suffix="%" label="IN-HOUSE ENGINEERING" />
          <StatCounter value={PRODUCTS[0].features.length} label="CORE MODULES IN ISMS" />
          <StatCounter value={12} suffix="+" label="USER ROLES SUPPORTED" />
          <StatCounter value={24} suffix="/7" label="SUPPORT COMMITMENT" />
        </Reveal>
      </section>

      {/* About */}
      <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-[2px] bg-[#035BD8]" />
              <span className="text-xs font-bold tracking-[0.15em] text-[#035BD8]">
                ABOUT KRETECH
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 leading-tight mb-6">
              Technology, built
              <br />
              <span className="bg-gradient-to-r from-[#00A5FD] to-[#035BD8] bg-clip-text text-transparent">
                with purpose
              </span>
            </h2>
            <p className="text-gray-500 mb-4">
              KreTech is a technology company that builds software people actually want to use.
              From early-stage startups to established enterprises, we partner with businesses
              across industries to design, build, and scale digital products that solve real
              problems.
            </p>
            <p className="text-gray-500 mb-8">
              We don&apos;t just write code — we understand your business, your users, and what
              success looks like for you. That&apos;s what turns a project into a product people
              rely on.
            </p>
            <a href="#contact">
              <Button className="rounded-full bg-gray-950 hover:bg-gray-800 text-white px-6 py-5">
                Learn More About Us
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </a>
          </Reveal>
          <Reveal delay={150} className="group hover:-translate-y-1 transition-transform duration-300">
            <div className="relative rounded-3xl overflow-hidden bg-white ring-1 ring-gray-100 min-h-[420px] flex items-center justify-center p-10 shadow-2xl shadow-gray-900/10 transition-colors duration-300 group-hover:bg-gradient-to-br group-hover:from-[#00A5FD] group-hover:to-[#035BD8]">
              <div className="pointer-events-none absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#00A5FD]/10 blur-3xl transition-opacity duration-300 group-hover:opacity-0" />
              <Image
                src="/kretech-logo-crop.png"
                alt="KreTech"
                width={600}
                height={130}
                className="relative w-full max-w-sm h-auto transition-opacity duration-300 group-hover:opacity-0"
              />
              <Image
                src="/kretech-logo-white-crop.png"
                alt="KreTech"
                width={600}
                height={127}
                className="absolute w-full max-w-sm h-auto opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <ServicesSection />

      {/* Products — product card on the left, demo-request form on the right */}
      <section id="work" className="bg-gray-50/60 border-y border-gray-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Reveal className="text-center mb-10">
            <span className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-[#035BD8] mb-3">
              <Layers className="w-3.5 h-3.5" />
              OUR PRODUCTS
            </span>
            <SplitHeading className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              What we've built
            </SplitHeading>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="grid gap-5">
              {PRODUCTS.map((p) => (
                <Reveal key={p.name} delay={100}>
                  <div className="rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-900/5 transition-shadow bg-white overflow-hidden">
                    <a href={p.href} className="group flex flex-col sm:flex-row sm:items-center gap-5 p-6 sm:p-8 hover:bg-[#00A5FD]/5 transition-colors">
                      <Image src="/isms-logo-blue.png" alt="iSMS" width={2092} height={731} className="h-10 w-auto shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-400">{p.tagline}</span>
                        <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium text-[#035BD8] shrink-0 group-hover:translate-x-0.5 transition-transform">
                        Visit iSMS
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </a>

                    {/* Product screenshot, framed as a browser window */}
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                      <div className="rounded-xl ring-1 ring-gray-100 shadow-inner overflow-hidden bg-gray-100">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="ml-2 text-[10px] font-mono text-gray-400">isms.study</span>
                        </div>
                        <Image
                          src="/dashboard-screenshot.png"
                          alt="iSMS dashboard"
                          width={1260}
                          height={752}
                          className="w-full h-auto"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-px bg-gray-100 border-t border-gray-100">
                      {p.features.map((f, i) => (
                        <div key={f.label} className="bg-white p-5 flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center shrink-0 shadow-sm shadow-black/10`}
                          >
                            <f.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={150} className="lg:sticky lg:top-24 lg:self-start">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#035BD8] to-[#151E3D] p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-2xl animate-blob-1" />
                  <div className="absolute -bottom-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl animate-blob-3" />
                </div>
                <div className="relative">
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                    See iSMS running your school
                  </h3>
                  <p className="text-[#B8D9FF] text-sm mb-6">
                    Tell us a bit about your school and we&apos;ll set up a live walkthrough — no
                    obligation, no sales script.
                  </p>
                  <div className="rounded-xl bg-white p-5 sm:p-6">
                    <DemoRequestForm />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Contact — dark CTA band with an animated network graphic backdrop */}
      <section id="contact" data-header-theme="dark" className="relative bg-gray-950 overflow-hidden scroll-mt-24">
        <NetworkGraphic />
        <Reveal className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#00A5FD] bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1.5 mb-4">
            <Mail className="w-3.5 h-3.5" />
            GET IN TOUCH
          </span>
          <SplitHeading className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
            Let's build something that lasts
          </SplitHeading>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Have a question about iSMS, or a product idea of your own? Reach out and we&apos;ll get back to you.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Button className="rounded-full bg-white text-gray-950 hover:bg-gray-200 font-mono text-[11px] tracking-[0.15em] px-6 py-5">
              <Mail className="w-4 h-4 mr-1" />
              {CONTACT_EMAIL}
            </Button>
          </a>
        </Reveal>
      </section>

      <footer data-header-theme="dark" className="bg-gray-950 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Image src="/kretech-logo-white-crop.png" alt="KreTech" width={600} height={127} className="h-5 w-auto" />
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} KreTech. All rights reserved.</p>
          <span className="text-xs text-gray-400">kretech.in</span>
        </div>
      </footer>
    </div>
  );
}
