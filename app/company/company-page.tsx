import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Code2,
  GraduationCap,
  Hammer,
  IndianRupee,
  Layers,
  LifeBuoy,
  Mail,
  MessageSquare,
  Palette,
  Rocket,
  Search,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DemoRequestForm } from "@/app/landing/demo-request-form";
import { HeroSlider } from "./hero-slider";
import { IndustriesSection } from "./industries-section";
import { MobileNav } from "./mobile-nav";
import { NetworkGraphic } from "./network-graphic";
import { Reveal } from "./reveal";
import { SectionNav } from "./section-nav";
import { SplitHeading } from "./split-heading";
import { StatCounter } from "./stat-counter";

// Cycled across feature tiles so the grid reads as colorful, not a wall of
// repeated brand-indigo squares — matches the treatment on the iSMS landing page.
const ICON_COLORS = [
  "from-indigo-500 to-indigo-600",
  "from-blue-500 to-blue-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-emerald-500 to-emerald-600",
  "from-rose-500 to-rose-600",
];

const VALUES = [
  { icon: Code2, label: "Engineering-led", desc: "We build in-house, top to bottom — no outsourced core." },
  { icon: Users, label: "Customer-obsessed", desc: "Real schools use iSMS daily; their feedback drives the roadmap." },
  { icon: Rocket, label: "Ship & iterate", desc: "Small, frequent releases over big-bang launches." },
  { icon: ShieldCheck, label: "Built to last", desc: "Products we run and support for years, not quarters." },
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

const PROCESS = [
  { icon: Search, step: "01", label: "Discover", desc: "We dig into the real workflow first — how a school actually runs day to day." },
  { icon: Palette, step: "02", label: "Design", desc: "Interfaces built for the people using them daily, not just the demo screen." },
  { icon: Hammer, step: "03", label: "Build", desc: "Next.js, TypeScript, Postgres — engineered in-house, shipped incrementally." },
  { icon: LifeBuoy, step: "04", label: "Support", desc: "We stay on after launch. Bugs get fixed, roadmaps get shaped by real usage." },
];

const TECH_STACK = [
  "Next.js", "TypeScript", "React", "PostgreSQL", "Prisma", "Tailwind CSS", "NextAuth", "Playwright",
];

const CONTACT_EMAIL = "educationhub1810@gmail.com";

export function CompanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <Image src="/kretech-logo-crop.png" alt="KreTech" width={600} height={130} className="h-7 w-auto" priority />
          <SectionNav />
          <div className="flex items-center gap-2">
            <a href={ISMS_HOME_URL}>
              <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-mono text-[11px] tracking-[0.15em] px-4">
                OPEN ISMS
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </a>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Hero — two-slide carousel over a soft blob backdrop */}
      <section id="intro" className="relative overflow-hidden bg-[#EAF5FF] scroll-mt-24">
        <HeroSlider
          slides={[
            {
              eyebrow: "A SOFTWARE ENGINEERING COMPANY.",
              heading: "We're KreTech",
              body: "We design, engineer, and support our own software products end to end — no outsourced core, no client hand-offs. Built in-house, on Next.js & TypeScript.",
              primaryCta: { label: "EXPLORE ISMS", href: ISMS_HOME_URL },
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
      <section className="bg-gray-950 border-t border-white/5">
        <Reveal className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatCounter value={100} suffix="%" label="IN-HOUSE ENGINEERING" />
          <StatCounter value={PRODUCTS[0].features.length} label="CORE MODULES IN ISMS" />
          <StatCounter value={12} suffix="+" label="USER ROLES SUPPORTED" />
          <StatCounter value={24} suffix="/7" label="SUPPORT COMMITMENT" />
        </Reveal>
      </section>

      {/* Demo request banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-navy-600">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-2xl animate-blob-1" />
          <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full bg-white/10 blur-2xl animate-blob-3" />
        </div>
        <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
            See iSMS running your school
          </h2>
          <p className="text-indigo-100 mb-10 max-w-md mx-auto">
            Tell us a bit about your school and we&apos;ll set up a live walkthrough — no
            obligation, no sales script.
          </p>
          <div className="max-w-lg mx-auto rounded-2xl bg-white shadow-2xl shadow-black/20 p-6 sm:p-8 text-left">
            <DemoRequestForm />
          </div>
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
              <Button className="rounded-full bg-gray-950 hover:bg-gray-800 text-white px-6 py-5 mb-10">
                Learn More About Us
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </a>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: 50, suffix: "+", label: "PROJECTS DELIVERED" },
                { value: 8, suffix: "+", label: "INDUSTRIES SERVED" },
                { value: 98, suffix: "%", label: "CLIENT SATISFACTION" },
                { value: 24, suffix: "/7", label: "SUPPORT AVAILABLE" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl ring-1 ring-gray-100 shadow-sm bg-white py-5 px-3">
                  <StatCounter
                    {...s}
                    numberClassName="text-[#035BD8]"
                    labelClassName="text-gray-500 normal-case font-sans font-semibold tracking-normal"
                  />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={150} className="hover:-translate-y-1 transition-transform duration-300">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#151E3D] to-[#0A3D91] min-h-[420px] flex items-center justify-center p-10 shadow-2xl shadow-blue-900/10">
              <div className="pointer-events-none absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#00A5FD]/25 blur-3xl" />
              <Image
                src="/kretech-logo-white-crop.png"
                alt="KreTech"
                width={600}
                height={127}
                className="relative w-full max-w-sm h-auto"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tech stack */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <Reveal className="text-center mb-8">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-gray-400">
            THE STACK WE BUILD ON
          </span>
        </Reveal>
        <Reveal delay={100} className="flex flex-wrap items-center justify-center gap-3">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-full ring-1 ring-gray-200 px-4 py-1.5 text-xs font-mono tracking-wide text-gray-600 bg-white hover:bg-gray-950 hover:text-white hover:ring-gray-950 transition-colors"
            >
              {tech}
            </span>
          ))}
        </Reveal>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map((v, i) => (
            <Reveal key={v.label} delay={i * 80}>
              <div className="rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-900/5 hover:-translate-y-1 transition-all duration-300 p-5 bg-white h-full">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center mb-3 shadow-md shadow-black/10`}
                >
                  <v.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{v.label}</p>
                <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Process */}
      <section id="process" className="bg-gray-50/60 border-y border-gray-100 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Reveal className="text-center mb-12">
            <span className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 mb-3">
              <Rocket className="w-3.5 h-3.5" />
              HOW WE WORK
            </span>
            <SplitHeading className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              From idea to shipped product
            </SplitHeading>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            {PROCESS.map((s, i) => (
              <Reveal key={s.label} delay={i * 120} className="relative">
                <div className="w-12 h-12 rounded-full bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center mb-4 relative z-10">
                  <s.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-mono text-[11px] tracking-[0.15em] text-gray-400">{s.step}</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-1 mb-1.5">{s.label}</h3>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="work" className="bg-gray-50/60 border-y border-gray-100 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Reveal className="text-center">
            <span className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 mb-3">
              <Layers className="w-3.5 h-3.5" />
              OUR PRODUCTS
            </span>
            <SplitHeading className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 leading-tight">
              What we've built
            </SplitHeading>
          </Reveal>
          <div className="grid gap-5">
            {PRODUCTS.map((p) => (
              <Reveal key={p.name} delay={100}>
                <div className="rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-900/5 transition-shadow bg-white overflow-hidden">
                  <a href={p.href} className="group flex flex-col sm:flex-row sm:items-center gap-5 p-6 sm:p-8 hover:bg-indigo-50/30 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-black/10">
                      <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                        <span className="text-xs font-medium text-gray-400">{p.tagline}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
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

                  <div className="grid sm:grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
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
        </div>
      </section>

      {/* Contact — dark CTA band with an animated network graphic backdrop */}
      <section id="contact" className="relative bg-gray-950 overflow-hidden scroll-mt-24">
        <NetworkGraphic />
        <Reveal className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-blue-300 bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1.5 mb-4">
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

      <footer className="bg-gray-950 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Image src="/kretech-logo-white-crop.png" alt="KreTech" width={600} height={127} className="h-5 w-auto" />
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} KreTech. All rights reserved.</p>
          <span className="text-xs text-gray-400">kretech.in</span>
        </div>
      </footer>
    </div>
  );
}
