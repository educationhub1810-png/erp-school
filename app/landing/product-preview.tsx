import {
  LayoutDashboard,
  Users,
  IndianRupee,
  ClipboardList,
  BarChart3,
  Bell,
  Search,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Students" },
  { icon: ClipboardList, label: "Attendance" },
  { icon: IndianRupee, label: "Fees" },
  { icon: BarChart3, label: "Reports" },
];

const STATS = [
  { label: "Students", value: "1,248", color: "bg-blue-500" },
  { label: "Attendance", value: "96.4%", color: "bg-green-500" },
  { label: "Fees Collected", value: "₹8.2L", color: "bg-amber-500" },
  { label: "Staff", value: "84", color: "bg-violet-500" },
];

// A static mockup of the app's real dashboard chrome (dark sidebar + indigo
// accents, matching components/shared/sidebar.tsx) — gives visitors a preview
// of the actual product screen without embedding a live/authenticated frame.
export function ProductPreview() {
  return (
    <div className="rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden bg-white">
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-2 border-b border-gray-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[11px] text-gray-400 bg-white rounded px-2 py-0.5 flex-1 max-w-[200px] truncate">
          app.eduerp.in/school-admin/dashboard
        </span>
      </div>

      <div className="flex h-[280px] sm:h-[320px]">
        {/* sidebar */}
        <div className="hidden sm:flex w-40 shrink-0 flex-col bg-gray-900 text-white p-3">
          <div className="flex items-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isms-wordmark-white.svg" alt="iSMS" className="h-4 w-auto" />
          </div>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] ${
                  item.active ? "bg-indigo-600 text-white" : "text-gray-400"
                }`}
              >
                <item.icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* main panel */}
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-semibold text-gray-800">Welcome back 👋</span>
            <div className="flex items-center gap-2 text-gray-400">
              <Search className="w-3.5 h-3.5" />
              <Bell className="w-3.5 h-3.5" />
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center">
                A
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-lg ring-1 ring-gray-100 p-2 shadow-sm">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color} mb-1`} />
                <p className="text-[10px] text-gray-400 truncate">{s.label}</p>
                <p className="text-xs sm:text-sm font-bold text-gray-800">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg ring-1 ring-gray-100 p-3 shadow-sm h-[110px] sm:h-[140px] flex items-end gap-1.5">
            {[40, 65, 50, 80, 55, 90, 70, 60, 85, 45, 75, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-indigo-500/80" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
