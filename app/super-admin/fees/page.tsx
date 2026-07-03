import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { sortClassesByGrade } from "@/lib/class-order";
import { computeExpectedTotal, buildPaidMap, frequencyLabel, installmentCount } from "@/lib/fees";
import { IndianRupee, Users, CalendarClock, BookOpen, Building2 } from "lucide-react";
import Link from "next/link";

type Tab = "overview" | "ledger" | "due-dates" | "class-pending";

interface Props {
  searchParams: Promise<{ tab?: string; schoolId?: string; classId?: string; search?: string }>;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",      label: "Overview" },
  { key: "ledger",        label: "Student Ledger" },
  { key: "due-dates",     label: "Due Date Summary" },
  { key: "class-pending", label: "Class-wise Pending" },
];

const statusStyle: Record<string, string> = {
  PAID:    "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PARTIAL: "bg-orange-100 text-orange-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function SuperAdminFeesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "overview") as Tab;
  const filterSchoolId = sp.schoolId ?? "";
  const filterClassId = sp.classId ?? "";
  const search = sp.search ?? "";

  // ── All schools for filter dropdown ──────────────────────────────────────
  const schools = await prisma.school.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // ── Core data (scoped to selected school if any) ──────────────────────────
  const schoolWhere = filterSchoolId ? { schoolId: filterSchoolId } : {};

  const [structures, classesRaw, allStudents, allPaymentsRaw] = await Promise.all([
    prisma.feeStructure.findMany({
      where: schoolWhere,
      include: {
        class: { select: { name: true } },
        school: { select: { id: true, name: true } },
      },
      orderBy: { feeType: "asc" },
    }),
    prisma.class.findMany({
      where: filterSchoolId ? { schoolId: filterSchoolId } : {},
      select: { id: true, name: true, schoolId: true },
    }),
    prisma.student.findMany({
      where: { isAlumni: false, ...schoolWhere },
      select: {
        id: true, classId: true, firstName: true, lastName: true,
        schoolId: true,
        class: { select: { id: true, name: true } },
        section: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.feePayment.findMany({
      where: schoolWhere,
      select: { id: true, studentId: true, feeStructureId: true, amountPaid: true, status: true, schoolId: true },
    }),
  ]);

  const classes = sortClassesByGrade(classesRaw);
  const paidMap = buildPaidMap(allPaymentsRaw);

  const totalCollected = allPaymentsRaw
    .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
    .reduce((s, p) => s + Number(p.amountPaid), 0);
  const expectedTotal = computeExpectedTotal(
    structures.map((s) => ({ amount: Number(s.amount), classId: s.classId, frequency: s.frequency })),
    allStudents,
  );
  const totalPending = Math.max(0, expectedTotal - totalCollected);

  function studentName(s: (typeof allStudents)[0]) {
    return s.user?.name ?? `${s.firstName} ${s.lastName}`;
  }

  // ── School filter URL builder ─────────────────────────────────────────────
  function tabUrl(t: Tab) {
    const params = new URLSearchParams();
    params.set("tab", t);
    if (filterSchoolId) params.set("schoolId", filterSchoolId);
    return `?${params.toString()}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filterSchoolId
              ? schools.find((s) => s.id === filterSchoolId)?.name
              : `All Schools · ${schools.length} schools`}
          </p>
        </div>
        {/* School filter */}
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <select
            name="schoolId"
            defaultValue={filterSchoolId}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Schools</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Filter
          </button>
          {filterSchoolId && (
            <Link href={`?tab=${tab}`} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Collected"   value={`₹${totalCollected.toLocaleString("en-IN")}`}   subtitle="Paid + Partial" icon={<IndianRupee className="w-4 h-4" />} color="green" />
        <StatCard title="Annual Expected"   value={`₹${expectedTotal.toLocaleString("en-IN")}`}    subtitle="Full-year obligation" icon={<IndianRupee className="w-4 h-4" />} color="blue" />
        <StatCard title="Annual Pending"    value={`₹${totalPending.toLocaleString("en-IN")}`}     subtitle="Outstanding balance" icon={<IndianRupee className="w-4 h-4" />} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabUrl(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? "bg-white border border-b-white text-indigo-600 border-gray-200 -mb-px"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Cross-school summary when no filter */}
          {!filterSchoolId && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  School-wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const schoolMap = new Map<string, { name: string; collected: number; expected: number; students: number }>();
                  for (const s of schools) schoolMap.set(s.id, { name: s.name, collected: 0, expected: 0, students: 0 });

                  for (const p of allPaymentsRaw) {
                    if (p.status === "PAID" || p.status === "PARTIAL") {
                      const row = schoolMap.get(p.schoolId);
                      if (row) row.collected += Number(p.amountPaid);
                    }
                  }
                  for (const st of allStudents) {
                    const row = schoolMap.get(st.schoolId);
                    if (row) row.students += 1;
                  }
                  for (const struct of structures) {
                    const schoolStudents = allStudents.filter((st) => st.schoolId === struct.schoolId);
                    const applicable = schoolStudents.filter((st) => !struct.classId || st.classId === struct.classId);
                    const row = schoolMap.get(struct.schoolId);
                    if (row) row.expected += Number(struct.amount) * installmentCount(struct.frequency) * applicable.length;
                  }

                  const rows = Array.from(schoolMap.values()).filter((r) => r.students > 0 || r.expected > 0);
                  if (rows.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No data.</p>;

                  return (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-500">School</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Students</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Annual Expected</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Collected</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Pending</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">% Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r) => {
                          const pct = r.expected > 0 ? Math.round((r.collected / r.expected) * 100) : 0;
                          const pending = Math.max(0, r.expected - r.collected);
                          return (
                            <tr key={r.name} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{r.students}</td>
                              <td className="px-4 py-3 text-right text-gray-700">₹{r.expected.toLocaleString("en-IN")}</td>
                              <td className="px-4 py-3 text-right text-green-600">₹{r.collected.toLocaleString("en-IN")}</td>
                              <td className={`px-4 py-3 text-right font-medium ${pending > 0 ? "text-red-600" : "text-gray-400"}`}>
                                ₹{pending.toLocaleString("en-IN")}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Fee Structures */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Fee Structures</CardTitle></CardHeader>
            <CardContent className="p-0">
              {structures.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No fee structures found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {!filterSchoolId && <th className="text-left px-4 py-3 font-medium text-gray-500">School</th>}
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Fee Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Frequency</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Annual Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Applies To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {structures.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        {!filterSchoolId && <td className="px-4 py-3 text-gray-500 text-xs">{s.school.name}</td>}
                        <td className="px-4 py-3 font-medium text-gray-900">{s.feeType}</td>
                        <td className="px-4 py-3 text-gray-600">{frequencyLabel(s.frequency)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{Number(s.amount).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ₹{(Number(s.amount) * installmentCount(s.frequency)).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.class?.name ?? "All classes"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STUDENT LEDGER TAB ── */}
      {tab === "ledger" && (() => {
        const filtered = allStudents.filter((s) => {
          if (filterClassId && s.classId !== filterClassId) return false;
          if (search) {
            const name = studentName(s).toLowerCase();
            if (!name.includes(search.toLowerCase())) return false;
          }
          return true;
        });

        const ledger = filtered.map((student) => {
          const applicable = structures.filter(
            (s) => s.schoolId === student.schoolId && (!s.classId || s.classId === student.classId),
          );
          const lines = applicable.map((s) => {
            const obligation = Number(s.amount) * installmentCount(s.frequency);
            const paid = paidMap.get(`${student.id}:${s.id}`) ?? 0;
            const balance = Math.max(0, obligation - paid);
            return { feeType: s.feeType, frequency: s.frequency, obligation, paid, balance };
          });
          const totalObligation = lines.reduce((sum, l) => sum + l.obligation, 0);
          const totalPaid = lines.reduce((sum, l) => sum + l.paid, 0);
          const totalBalance = lines.reduce((sum, l) => sum + l.balance, 0);
          return { student, lines, totalObligation, totalPaid, totalBalance };
        });

        return (
          <div className="space-y-4">
            <form method="GET" className="flex gap-3">
              <input type="hidden" name="tab" value="ledger" />
              {filterSchoolId && <input type="hidden" name="schoolId" value={filterSchoolId} />}
              <input
                name="search"
                defaultValue={search}
                placeholder="Search student name…"
                className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                name="classId"
                defaultValue={filterClassId}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Filter</button>
            </form>

            {ledger.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No students found.</p>
            ) : (
              <div className="space-y-3">
                {ledger.map(({ student, lines, totalObligation, totalPaid, totalBalance }) => (
                  <Card key={student.id} className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{studentName(student)}</p>
                          <p className="text-xs text-gray-500">
                            {student.class.name}{student.section ? ` – ${student.section.name}` : ""}
                            {!filterSchoolId && ` · ${structures.find((s) => s.schoolId === student.schoolId)?.school.name ?? ""}`}
                          </p>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <p className="text-xs text-gray-400">Annual Due</p>
                            <p className="text-sm font-semibold text-gray-800">₹{totalObligation.toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Paid</p>
                            <p className="text-sm font-semibold text-green-600">₹{totalPaid.toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Balance</p>
                            <p className={`text-sm font-semibold ${totalBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                              ₹{totalBalance.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </div>
                      {lines.length > 0 && (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left px-4 py-2 font-medium text-gray-400">Fee Type</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-400">Frequency</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-400">Annual Due</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-400">Paid</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-400">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {lines.map((l, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-700">{l.feeType}</td>
                                <td className="px-4 py-2 text-gray-500">{frequencyLabel(l.frequency)}</td>
                                <td className="px-4 py-2 text-right text-gray-700">₹{l.obligation.toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2 text-right text-green-600">₹{l.paid.toLocaleString("en-IN")}</td>
                                <td className={`px-4 py-2 text-right font-medium ${l.balance > 0 ? "text-red-600" : "text-gray-400"}`}>
                                  ₹{l.balance.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── DUE DATE SUMMARY TAB ── */}
      {tab === "due-dates" && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        interface DueItem {
          structureId: string;
          feeType: string;
          frequency: string;
          className: string;
          schoolName: string;
          dueLabel: string;
          dueDate: Date | null;
          totalStudents: number;
          totalExpected: number;
          totalCollected: number;
          totalPending: number;
          isOverdue: boolean;
        }

        const dueItems: DueItem[] = [];

        for (const s of structures) {
          const applicableStudents = allStudents.filter(
            (st) => st.schoolId === s.schoolId && (!s.classId || st.classId === s.classId),
          );
          const count = applicableStudents.length;
          const amountPerInstallment = Number(s.amount);
          const collected = applicableStudents.reduce(
            (sum, st) => sum + (paidMap.get(`${st.id}:${s.id}`) ?? 0), 0,
          );

          if (s.frequency === "MONTHLY") {
            const dayLabel = s.monthlyDueDay ? `${s.monthlyDueDay}th of each month` : "recurring";
            const annualExpected = amountPerInstallment * 12 * count;
            dueItems.push({
              structureId: s.id, feeType: s.feeType, frequency: s.frequency,
              className: s.class?.name ?? "All classes",
              schoolName: s.school.name,
              dueLabel: `Monthly — due on ${dayLabel}`,
              dueDate: null,
              totalStudents: count,
              totalExpected: annualExpected,
              totalCollected: collected,
              totalPending: Math.max(0, annualExpected - collected),
              isOverdue: false,
            });
            continue;
          }

          if (s.frequency === "QUARTERLY" || s.frequency === "HALF_YEARLY") {
            const installments = s.installments as { period: string; dueDate?: string }[] | null;
            if (installments?.length) {
              for (const inst of installments) {
                const dd = inst.dueDate ? new Date(inst.dueDate) : null;
                const isOverdue = dd ? dd < today : false;
                dueItems.push({
                  structureId: s.id, feeType: s.feeType, frequency: s.frequency,
                  className: s.class?.name ?? "All classes",
                  schoolName: s.school.name,
                  dueLabel: inst.period,
                  dueDate: dd,
                  totalStudents: count,
                  totalExpected: amountPerInstallment * count,
                  totalCollected: collected,
                  totalPending: Math.max(0, amountPerInstallment * count - collected),
                  isOverdue,
                });
              }
              continue;
            }
          }

          const dd = s.dueDate ? new Date(s.dueDate) : null;
          const isOverdue = dd ? dd < today : false;
          const totalExpected = amountPerInstallment * installmentCount(s.frequency) * count;
          dueItems.push({
            structureId: s.id, feeType: s.feeType, frequency: s.frequency,
            className: s.class?.name ?? "All classes",
            schoolName: s.school.name,
            dueLabel: frequencyLabel(s.frequency),
            dueDate: dd,
            totalStudents: count,
            totalExpected,
            totalCollected: collected,
            totalPending: Math.max(0, totalExpected - collected),
            isOverdue,
          });
        }

        dueItems.sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          return 0;
        });

        const overdueItems = dueItems.filter((d) => d.isOverdue);
        const upcomingItems = dueItems.filter((d) => !d.isOverdue && d.dueDate);
        const recurringItems = dueItems.filter((d) => !d.dueDate);

        const SummaryTable = ({ items }: { items: DueItem[] }) => (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                {!filterSchoolId && <th className="text-left px-4 py-3 font-medium text-gray-500">School</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fee Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Period / Due</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Students</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Collected</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((d, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${d.isOverdue ? "bg-red-50" : ""}`}>
                  {!filterSchoolId && <td className="px-4 py-3 text-gray-500 text-xs">{d.schoolName}</td>}
                  <td className="px-4 py-3 font-medium text-gray-900">{d.feeType}</td>
                  <td className="px-4 py-3 text-gray-500">{d.className}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{d.dueLabel}</div>
                    {d.dueDate && (
                      <div className={`text-xs ${d.isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        {d.isOverdue ? "Overdue · " : "Due: "}
                        {d.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{d.totalStudents}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{d.totalExpected.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-green-600">₹{d.totalCollected.toLocaleString("en-IN")}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.totalPending > 0 ? (d.isOverdue ? "text-red-600" : "text-orange-600") : "text-gray-400"}`}>
                    ₹{d.totalPending.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

        return (
          <div className="space-y-4">
            {overdueItems.length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-red-500" />
                    Overdue ({overdueItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={overdueItems} /></CardContent>
              </Card>
            )}
            {upcomingItems.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-indigo-500" />
                    Upcoming Due Dates ({upcomingItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={upcomingItems} /></CardContent>
              </Card>
            )}
            {recurringItems.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-gray-400" />
                    Recurring / No Specific Date ({recurringItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={recurringItems} /></CardContent>
              </Card>
            )}
            {dueItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No fee structures defined yet.</p>
            )}
          </div>
        );
      })()}

      {/* ── CLASS-WISE PENDING TAB ── */}
      {tab === "class-pending" && (() => {
        const classBuckets = new Map<string, { className: string; schoolName: string; classSchoolId: string; students: typeof allStudents }>();
        for (const cls of classes) {
          const school = structures.find((s) => s.schoolId === cls.schoolId)?.school;
          classBuckets.set(cls.id, { className: cls.name, schoolName: school?.name ?? "", classSchoolId: cls.schoolId, students: [] });
        }
        for (const student of allStudents) {
          const bucket = classBuckets.get(student.classId);
          if (bucket) bucket.students.push(student);
        }

        const classRows = Array.from(classBuckets.values())
          .filter((b) => b.students.length > 0)
          .map((bucket) => {
            const applicable = structures.filter(
              (s) => s.schoolId === bucket.classSchoolId && (!s.classId || bucket.students.some((st) => st.classId === s.classId || !s.classId)),
            );
            const classObligations = bucket.students.map((student) => {
              const studentStructures = applicable.filter((s) => !s.classId || s.classId === student.classId);
              const lines = studentStructures.map((s) => {
                const obligation = Number(s.amount) * installmentCount(s.frequency);
                const paid = paidMap.get(`${student.id}:${s.id}`) ?? 0;
                const balance = Math.max(0, obligation - paid);
                return { obligation, paid, balance };
              });
              return {
                student,
                totalObligation: lines.reduce((sum, l) => sum + l.obligation, 0),
                totalPaid: lines.reduce((sum, l) => sum + l.paid, 0),
                totalBalance: lines.reduce((sum, l) => sum + l.balance, 0),
              };
            }).filter((r) => r.totalBalance > 0);

            const classTotalPending = classObligations.reduce((sum, r) => sum + r.totalBalance, 0);
            const classTotalPaid = classObligations.reduce((sum, r) => sum + r.totalPaid, 0);
            const classTotalObligation = classObligations.reduce((sum, r) => sum + r.totalObligation, 0);
            return { className: bucket.className, schoolName: bucket.schoolName, students: classObligations, classTotalObligation, classTotalPaid, classTotalPending };
          })
          .filter((c) => c.students.length > 0)
          .sort((a, b) => b.classTotalPending - a.classTotalPending);

        const grandTotal = classRows.reduce((sum, c) => sum + c.classTotalPending, 0);

        return (
          <div className="space-y-4">
            {classRows.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm">
                <Users className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-700 font-medium">
                  {classRows.reduce((sum, c) => sum + c.students.length, 0)} students across {classRows.length} classes have a pending balance of{" "}
                  <span className="font-bold">₹{grandTotal.toLocaleString("en-IN")}</span>
                </span>
              </div>
            )}
            {classRows.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No pending fees found.</p>}
            {classRows.map((cls, ci) => (
              <Card key={ci} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-indigo-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-gray-900 text-sm">{cls.className}</span>
                      {!filterSchoolId && <span className="text-xs text-gray-500">· {cls.schoolName}</span>}
                      <span className="text-xs text-gray-500">· {cls.students.length} pending</span>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">Expected</p>
                        <p className="text-sm font-semibold text-gray-700">₹{cls.classTotalObligation.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Collected</p>
                        <p className="text-sm font-semibold text-green-600">₹{cls.classTotalPaid.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Pending</p>
                        <p className="text-sm font-bold text-red-600">₹{cls.classTotalPending.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">#</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Student</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Annual Due</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Paid</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Pending</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cls.students.map((row, idx) => {
                        const pct = row.totalObligation > 0 ? Math.round((row.totalPaid / row.totalObligation) * 100) : 0;
                        return (
                          <tr key={row.student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{studentName(row.student)}</td>
                            <td className="px-4 py-2 text-right text-gray-700">₹{row.totalObligation.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2 text-right text-green-600">₹{row.totalPaid.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2 text-right font-semibold text-red-600">₹{row.totalBalance.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
