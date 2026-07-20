import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  Users,
  ClipboardList,
  IndianRupee,
  Video,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  School,
  Baby,
  BookOpen,
  Sparkles,
  GraduationCap,
  Star,
  PenLine,
  Clock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";
import { DemoRequestForm } from "./demo-request-form";
import { CursorPen } from "./cursor-pen";
import { MobileNav } from "./mobile-nav";

// A distinct accent font for the nav menu items only — the rest of the app
// keeps Inter (set globally in app/layout.tsx).
const navFont = Poppins({ subsets: ["latin"], weight: ["500", "600"] });

// Cycled across feature/solution icon tiles so the grid reads as colorful
// and modern rather than a wall of repeated brand-indigo squares.
const ICON_COLORS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-emerald-500 to-emerald-600",
  "from-rose-500 to-rose-600",
  "from-sky-500 to-sky-600",
  "from-orange-500 to-orange-600",
  "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600",
];

const FEATURES = [
  { icon: Users, label: "Student & Staff Management", desc: "Admissions, profiles, classes, sections — all in one place." },
  { icon: ClipboardList, label: "Attendance", desc: "Daily student & staff attendance with real-time tracking." },
  { icon: IndianRupee, label: "Fees & Accounting", desc: "Fee structures, collection, receipts and expense tracking." },
  { icon: Video, label: "LMS & Homework", desc: "Course content, assignments and homework submissions." },
  { icon: MessageSquare, label: "Communication", desc: "Announcements and messaging between school and parents." },
  { icon: BarChart3, label: "Reports & Analytics", desc: "Real-time dashboards across every module." },
];

const STATS = [
  { icon: ShieldCheck, label: "Secure & Reliable", color: "bg-blue-500" },
  { icon: Users, label: "Multi Role Access", color: "bg-violet-500" },
  { icon: BarChart3, label: "Real-time Analytics", color: "bg-green-500" },
  { icon: Globe, label: "Access Anywhere", color: "bg-orange-500" },
];

const SCHOOL_TYPES = [
  {
    icon: Baby,
    label: "Preschools & Daycares",
    desc: "Give parents peace of mind with real-time updates and easy fee tracking.",
  },
  {
    icon: School,
    label: "K-12 Schools",
    desc: "One system for the entire school year — admissions, exams, and results, sorted.",
  },
  {
    icon: BookOpen,
    label: "Coaching & Institutes",
    desc: "Keep every batch, test, and student on track — without the spreadsheets.",
  },
];

// Small decorative icons drifting behind the hero — echoes the login page's
// background treatment so the two feel like one product.
const HERO_ICONS = [
  { icon: GraduationCap, className: "top-[10%] left-[4%] w-8 h-8 text-indigo-300/40 animate-float-1" },
  { icon: Star, className: "top-[65%] left-[8%] w-5 h-5 text-amber-300/50 animate-float-3" },
  { icon: PenLine, className: "top-[20%] right-[6%] w-6 h-6 text-navy-300/40 animate-float-2" },
  { icon: Sparkles, className: "bottom-[12%] right-[10%] w-6 h-6 text-blue-300/50 animate-float-1" },
];

const NAV_LINKS = [
  { href: "#solutions", label: "Solutions" },
  { href: "#features", label: "Features" },
  { href: "#request-demo", label: "Demo" },
];

// Drifting glass bubbles scattered behind the hero, in a mix of sizes so the
// field doesn't read as a repeating tile. Sizes are in pixels.
const HERO_BUBBLES = [
  { size: 120, className: "top-[6%] left-[14%] from-blue-300/40 animate-bubble-1" },
  { size: 44, className: "top-[52%] left-[4%] from-indigo-300/40 animate-bubble-2" },
  { size: 170, className: "top-[10%] left-[78%] from-navy-300/30 animate-bubble-3" },
  { size: 60, className: "top-[78%] left-[86%] from-sky-300/40 animate-bubble-4" },
  { size: 28, className: "top-[36%] left-[68%] from-blue-200/50 animate-bubble-2" },
  { size: 80, className: "top-[82%] left-[36%] from-indigo-200/40 animate-bubble-1" },
  { size: 36, className: "top-[22%] left-[46%] from-navy-200/40 animate-bubble-4" },
];

const DEMO_BENEFITS = [
  { icon: Users, title: "Personalized walkthrough", desc: "See exactly how iSMS fits your school's day-to-day workflow." },
  { icon: Clock, title: "Fast response", desc: "Our team reaches out within 24 hours to schedule a time." },
  { icon: ShieldCheck, title: "No commitment", desc: "Explore the full platform with zero obligation." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <CursorPen />

      {/* Nav */}
      <header className="sticky top-3 sm:top-4 z-30 px-3 sm:px-4">
        <div className="relative max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-white/80 backdrop-blur-lg ring-1 ring-gray-100 shadow-lg shadow-gray-900/5 px-4 sm:px-6 py-3">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isms-logo-blue.png" alt="iSMS" className="h-7 w-auto" />
          </div>
          <nav className={`${navFont.className} hidden md:flex items-center gap-1 text-sm font-medium tracking-wide text-gray-700`}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#request-demo" className="hidden sm:block">
              <Button variant="outline" className="rounded-full">
                Request a Demo
              </Button>
            </a>
            <Link href="/login">
              <Button className="rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20">
                Login
              </Button>
            </Link>
            <MobileNav links={NAV_LINKS} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white">
        {/* Ambient drifting background blobs + floating icons */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob-1 absolute -top-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="animate-blob-2 absolute top-10 -right-24 w-[30rem] h-[30rem] rounded-full bg-blue-300/25 blur-3xl" />
          <div className="animate-blob-3 absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-navy-200/25 blur-3xl" />
          {HERO_BUBBLES.map((b, i) => (
            <span
              key={i}
              className={`absolute rounded-full bg-gradient-to-br to-white/5 ring-1 ring-white/60 backdrop-blur-sm ${b.className}`}
              style={{ width: b.size, height: b.size }}
            />
          ))}
          {HERO_ICONS.map(({ icon: Icon, className }, i) => (
            <Icon key={i} className={`absolute ${className}`} />
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-24 grid lg:grid-cols-2 gap-10 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              The Power of Integration, Built for Education
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
              Run your entire school from{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-navy-600 bg-clip-text text-transparent">
                one platform
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 mb-7 max-w-lg">
              One dashboard for everything — admissions, attendance, fees, exams, transport, and
              more. Built for every role in your school.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-600/25 transition-transform hover:-translate-y-0.5"
                >
                  Login to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#request-demo">
                <Button size="lg" variant="outline" className="bg-white/70 backdrop-blur transition-transform hover:-translate-y-0.5">
                  Request a Demo
                </Button>
              </a>
            </div>
          </div>
          <div className="relative animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/50 via-blue-200/40 to-navy-200/40 blur-2xl" />
            <ProductPreview />
          </div>
        </div>

        {/* Floating stat strip, overlapping the hero/next-section seam */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 -mb-16 sm:-mb-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 rounded-2xl bg-white shadow-xl shadow-gray-900/5 ring-1 ring-gray-100 p-4 sm:p-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-black/10 ${s.color}`}>
                  <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="solutions" className="pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-3">
              SOLUTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Built for every kind of school</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Whichever stage your institution is at, iSMS adapts to how you run it.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {SCHOOL_TYPES.map((s, i) => (
              <div key={s.label} className="group h-64 [perspective:1200px]">
                <div className="relative w-full h-full transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                  {/* Front */}
                  <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl ring-1 ring-gray-100 shadow-sm p-6 flex flex-col items-center justify-center text-center bg-white">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center mb-4 shadow-md shadow-black/10`}
                    >
                      <s.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{s.label}</h3>
                    <p className="text-xs text-gray-400 mt-2">Hover to learn more</p>
                  </div>
                  {/* Back */}
                  <div
                    className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]}`}
                  >
                    <s.icon className="w-7 h-7 text-white/80 mb-3" />
                    <h3 className="font-semibold text-white mb-1.5">{s.label}</h3>
                    <p className="text-sm text-white/90">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product video */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-3">
              WATCH
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">See iSMS in motion</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A quick walkthrough of admissions, attendance, fees and more — all from one dashboard.
            </p>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/40 via-blue-200/30 to-navy-200/30 blur-2xl" />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              className="w-full rounded-2xl shadow-2xl shadow-indigo-900/20 ring-1 ring-black/10 bg-black"
              src="/hero-demo.mp4"
              poster="/dashboard-screenshot.png"
              controls
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              loop
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-16 sm:py-20 bg-gray-50/70"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-100 rounded-full px-3 py-1 mb-3">
              FEATURES
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Everything your school needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              One system for administrators, principals, teachers, students, parents and staff.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="group flex items-start gap-4 bg-white rounded-xl ring-1 ring-gray-100 p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 hover:ring-indigo-100 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center shrink-0 shadow-md shadow-black/10 group-hover:scale-110 transition-transform`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.label}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-navy-600 px-6 sm:px-14 py-12 sm:py-16 text-center shadow-2xl shadow-indigo-600/25">
            <div className="pointer-events-none absolute -top-16 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
            <h2 className="relative text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Ready to modernize your school?
            </h2>
            <p className="relative text-indigo-100 max-w-xl mx-auto mb-7">
              Join schools already running admissions, attendance, fees and more from a single
              dashboard — with nothing to install.
            </p>
            <div className="relative flex flex-wrap items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg">
                  Login to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#request-demo">
                <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Request a Demo
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Request a demo */}
      <section id="request-demo" className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="pointer-events-none absolute top-10 left-[10%] w-64 h-64 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[10%] w-64 h-64 rounded-full bg-navy-100/40 blur-3xl" />

        <div className="relative grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-center">
          {/* Left: pitch + what to expect */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              GET STARTED
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
              See iSMS in action
            </h2>
            <p className="text-gray-500 mb-9 max-w-md">
              Tell us about your school and we&apos;ll set up a personalized demo — no pressure,
              just a walkthrough of what fits.
            </p>
            <div className="space-y-6">
              {DEMO_BENEFITS.map((b, i) => (
                <div key={b.title} className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center shrink-0 shadow-md shadow-black/10`}
                  >
                    <b.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{b.title}</h3>
                    <p className="text-sm text-gray-500">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form card */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/40 via-blue-200/30 to-navy-200/30 blur-2xl" />
            <div className="relative bg-white rounded-2xl ring-1 ring-gray-100 shadow-xl shadow-gray-900/10 p-6 sm:p-8">
              <DemoRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/isms-wordmark-white.svg" alt="iSMS" className="h-6 w-auto" />
              <p className="text-xs text-gray-400 max-w-xs text-center sm:text-left">
                The power of integration, built for education.
              </p>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} iSMS. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {STATS.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${s.color}`}>
                    <s.icon className="w-3 h-3 text-white" />
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
