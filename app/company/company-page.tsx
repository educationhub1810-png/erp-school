import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Code2,
  GraduationCap,
  IndianRupee,
  Layers,
  Mail,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

// "/" on isms.study is this same company page, so links into the product
// go to its own marketing home (app/isms) — visitors log in from there
// themselves, same as the old isms.study root used to work.
const ISMS_HOME_URL = "https://isms.study/isms";

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

const CONTACT_EMAIL = "educationhub1810@gmail.com";

export function CompanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-3 sm:top-4 z-30 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-white/80 backdrop-blur-lg ring-1 ring-gray-100 shadow-lg shadow-gray-900/5 px-4 sm:px-6 py-3">
          <span className="text-lg font-bold tracking-tight text-gray-900">VSkreative</span>
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-700">
            <a href="#about" className="rounded-full px-4 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              About
            </a>
            <a href="#products" className="rounded-full px-4 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Products
            </a>
            <a href="#contact" className="rounded-full px-4 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              Contact
            </a>
            <a href={ISMS_HOME_URL} className="rounded-full px-4 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              iSMS
            </a>
          </nav>
          <a href={ISMS_HOME_URL}>
            <Button className="rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20">
              Open iSMS
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="absolute top-10 -right-24 w-[30rem] h-[30rem] rounded-full bg-blue-300/20 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            A product-based technology company
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            We&apos;re VSkreative
          </h1>
          <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto">
            We design and build our own software products end to end. Our first product, iSMS,
            is a school management platform already running real schools today.
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 scroll-mt-24">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 mb-4">
              <Target className="w-3.5 h-3.5" />
              WHAT WE DO
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              We build software, not slideware
            </h2>
            <p className="text-gray-500">
              VSkreative is a small, product-focused engineering team. Instead of taking on client
              projects, we pick a problem, build a product around it, and stay with it long after
              launch — support, iteration, and all.
            </p>
          </div>
          <div className="rounded-2xl ring-1 ring-gray-100 shadow-sm p-6 sm:p-8 bg-gray-50/60">
            <ul className="space-y-4 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                We own our products end to end — engineering, design, and support.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                We build for real users first — iSMS runs live schools today.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                We keep the portfolio focused rather than spread thin.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map((v, i) => (
            <div
              key={v.label}
              className="rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-md hover:shadow-gray-900/5 transition-shadow p-5 bg-white"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ICON_COLORS[i % ICON_COLORS.length]} flex items-center justify-center mb-3 shadow-md shadow-black/10`}
              >
                <v.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{v.label}</p>
              <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-24">
          <span className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 mb-3">
            <Layers className="w-3.5 h-3.5" />
            OUR PRODUCTS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center leading-tight">
            What we&apos;ve built
          </h2>
          <div className="grid gap-5">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl ring-1 ring-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-900/5 transition-shadow bg-white overflow-hidden"
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center scroll-mt-24">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 mb-4">
          <Mail className="w-3.5 h-3.5" />
          GET IN TOUCH
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Have a question?
        </h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Reach out and we&apos;ll get back to you.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Mail className="w-4 h-4" />
          {CONTACT_EMAIL}
        </a>
      </section>

      <footer className="bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">VSkreative</span>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} VSkreative. All rights reserved.</p>
          <span className="text-xs text-gray-400">kretech.in</span>
        </div>
      </footer>
    </div>
  );
}
