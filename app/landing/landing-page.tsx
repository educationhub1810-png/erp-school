import Link from "next/link";
import {
  Users,
  ClipboardList,
  IndianRupee,
  Library,
  Bus,
  Building2,
  Video,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Cloud,
  ArrowRight,
  School,
  Baby,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";
import { DemoRequestForm } from "./demo-request-form";

const FEATURES = [
  { icon: Users, label: "Student & Staff Management", desc: "Admissions, profiles, classes, sections — all in one place." },
  { icon: ClipboardList, label: "Attendance", desc: "Daily student & staff attendance with real-time tracking." },
  { icon: IndianRupee, label: "Fees & Accounting", desc: "Fee structures, collection, receipts and expense tracking." },
  { icon: Library, label: "Library", desc: "Book catalog, issue/return workflows and fine management." },
  { icon: Bus, label: "Transport", desc: "Routes, vehicles and student transport assignments." },
  { icon: Building2, label: "Hostel", desc: "Room allocation and hostel attendance for boarders." },
  { icon: Video, label: "LMS & Homework", desc: "Course content, assignments and homework submissions." },
  { icon: MessageSquare, label: "Communication", desc: "Announcements and messaging between school and parents." },
  { icon: BarChart3, label: "Reports & Analytics", desc: "Real-time dashboards across every module." },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Secure by design" },
  { icon: Cloud, label: "Cloud based, zero setup" },
  { icon: Users, label: "Role-based access for every stakeholder" },
];

const STATS = [
  { value: "12", label: "Role-based dashboards" },
  { value: "9", label: "Integrated modules" },
  { value: "100%", label: "Cloud based" },
  { value: "0", label: "Setup required" },
];

const SCHOOL_TYPES = [
  { icon: Baby, label: "Preschools & Daycares", desc: "Simple attendance, parent updates and fee tracking built for young learners." },
  { icon: School, label: "K-12 Schools", desc: "Full academic-year management — admissions, exams, results and everything between." },
  { icon: BookOpen, label: "Coaching & Institutes", desc: "Batch scheduling, test series and progress tracking for focused programs." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-indigo-50/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-6">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isms-logo-blue.png" alt="iSMS" className="h-7 w-auto" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#request-demo"
              className="hidden sm:inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Request a Demo
            </a>
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-4">
            SMART SCHOOL MANAGEMENT SYSTEM
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Run your entire school from one platform
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mb-7 max-w-lg">
            iSMS brings admissions, attendance, fees, exams, transport, hostel and communication
            together — with a dedicated dashboard for every role in your school.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                Login to Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#request-demo">
              <Button size="lg" variant="outline">
                Request a Demo
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap gap-4 mt-8">
            {TRUST_POINTS.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <t.icon className="w-3.5 h-3.5 text-indigo-600" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
        <ProductPreview />
      </section>

      {/* Stat strip */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Built for every kind of school</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Whichever stage your institution is at, iSMS adapts to how you run it.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {SCHOOL_TYPES.map((s) => (
              <div key={s.label} className="rounded-2xl ring-1 ring-gray-100 shadow-sm p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{s.label}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Everything your school needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              One system for administrators, principals, teachers, students, parents and staff.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="bg-white rounded-xl ring-1 ring-gray-100 p-5 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                  <f.icon className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.label}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request a demo */}
      <section id="request-demo" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">See iSMS in action</h2>
          <p className="text-gray-500">
            Tell us about your school and we&apos;ll set up a personalized demo.
          </p>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-6 sm:p-8">
          <DemoRequestForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isms-logo-blue.png" alt="iSMS" className="h-5 w-auto" />
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} iSMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
