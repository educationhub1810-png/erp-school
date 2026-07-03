import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { sortClassesByGrade } from "@/lib/class-order";
import { SlabDialog } from "@/components/transport/slab-dialog";
import { RouteDialog } from "@/components/transport/route-dialog";
import { AssignStudentDialog } from "@/components/transport/assign-student-dialog";
import { Bus, Users, IndianRupee, MapPin } from "lucide-react";
import Link from "next/link";

type Tab = "slabs" | "routes" | "students" | "summary";

interface Props {
  searchParams: Promise<{ tab?: string; routeId?: string }>;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "slabs",    label: "Distance Slabs" },
  { key: "routes",   label: "Routes" },
  { key: "students", label: "Student Assignments" },
  { key: "summary",  label: "Fee Summary" },
];

export default async function TransportPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const tab = (sp.tab ?? "slabs") as Tab;
  const filterRouteId = sp.routeId ?? "";

  const [slabs, routes, allStudents, assignments] = await Promise.all([
    prisma.transportDistanceSlab.findMany({
      where: { schoolId },
      orderBy: { fromKm: "asc" },
    }),
    prisma.transportRoute.findMany({
      where: { schoolId },
      include: { _count: { select: { students: true } } },
      orderBy: { routeName: "asc" },
    }),
    prisma.student.findMany({
      where: { schoolId, isAlumni: false },
      include: {
        user:    { select: { name: true } },
        class:   { select: { name: true } },
        section: { select: { name: true } },
        transportAssign: true,
      },
      orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.transportStudent.findMany({
      where: { schoolId },
      include: {
        student: {
          include: {
            user:    { select: { name: true } },
            class:   { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        route: { select: { id: true, routeName: true } },
        slab:  { select: { id: true, label: true, amount: true, fromKm: true, toKm: true } },
      },
      orderBy: { student: { class: { name: "asc" } } },
    }),
  ]);

  const assignedStudentIds = new Set(assignments.map((a) => a.studentId));
  const unassignedStudents = allStudents.filter((s) => !assignedStudentIds.has(s.id));

  const totalFeeMonthly = assignments.reduce((sum, a) => sum + (a.feeAmount ?? a.slab?.amount ?? 0), 0);
  const totalFeeAnnual  = totalFeeMonthly * 12;

  const classesRaw = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const classes = sortClassesByGrade(classesRaw);

  function studentName(s: typeof allStudents[0]) {
    return s.user?.name ?? `${s.firstName} ${s.lastName}`;
  }

  const slabsForDialog = slabs.map((s) => ({ id: s.id, label: s.label, amount: s.amount, fromKm: s.fromKm, toKm: s.toKm }));
  const routesForDialog = routes.map((r) => ({ id: r.id, routeName: r.routeName }));
  const studentsForDialog = unassignedStudents.map((s) => ({
    id: s.id,
    name: studentName(s),
    className: s.class.name,
  }));

  const filteredAssignments = filterRouteId
    ? assignments.filter((a) => a.routeId === filterRouteId)
    : assignments;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {routes.length} routes · {assignments.length} students assigned
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Distance Slabs"   value={String(slabs.length)}        subtitle="Fee tiers defined"       icon={<MapPin className="w-4 h-4" />} color="purple" />
        <StatCard title="Routes"            value={String(routes.length)}        subtitle="Active routes"           icon={<Bus className="w-4 h-4" />}    color="blue" />
        <StatCard title="Students"          value={String(assignments.length)}   subtitle="On school transport"     icon={<Users className="w-4 h-4" />}   color="green" />
        <StatCard title="Monthly Revenue"   value={`₹${totalFeeMonthly.toLocaleString("en-IN")}`} subtitle={`₹${totalFeeAnnual.toLocaleString("en-IN")} annually`} icon={<IndianRupee className="w-4 h-4" />} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
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

      {/* ── DISTANCE SLABS ── */}
      {tab === "slabs" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Distance-based Fee Slabs</CardTitle>
            <SlabDialog />
          </CardHeader>
          <CardContent className="p-0">
            {slabs.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No distance slabs yet.</p>
                <p className="text-xs text-gray-400 mt-1">Add slabs like "0–3 km → ₹500/mo", "3–5 km → ₹800/mo"</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Label</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Distance Range</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Monthly Fee</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Annual Fee</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Students</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slabs.map((s) => {
                    const studentCount = assignments.filter((a) => a.slabId === s.id).length;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.label}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.fromKm} km – {s.toKm != null ? `${s.toKm} km` : "above"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          ₹{s.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          ₹{(s.amount * 12).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{studentCount}</td>
                        <td className="px-4 py-3 text-right">
                          <SlabDialog slab={{ id: s.id, label: s.label, fromKm: s.fromKm, toKm: s.toKm, amount: s.amount }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ROUTES ── */}
      {tab === "routes" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transport Routes</CardTitle>
            <RouteDialog />
          </CardHeader>
          <CardContent className="p-0">
            {routes.length === 0 ? (
              <div className="text-center py-16">
                <Bus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No routes defined yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Route Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Vehicle</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Driver</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Driver Mobile</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Capacity</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Students</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {routes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.routeName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.vehicleNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.driverName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.driverMobile ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.capacity ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${r.capacity && r._count.students > r.capacity ? "text-red-600" : "text-gray-700"}`}>
                          {r._count.students}
                          {r.capacity ? ` / ${r.capacity}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RouteDialog route={{ id: r.id, routeName: r.routeName, vehicleNumber: r.vehicleNumber, driverName: r.driverName, driverMobile: r.driverMobile, capacity: r.capacity }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STUDENT ASSIGNMENTS ── */}
      {tab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <form method="GET" className="flex gap-2">
              <input type="hidden" name="tab" value="students" />
              <select name="routeId" defaultValue={filterRouteId}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Routes</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.routeName}</option>)}
              </select>
              <button type="submit" className="h-9 px-4 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200">Filter</button>
            </form>
            {routes.length > 0 && (
              <AssignStudentDialog
                routes={routesForDialog}
                slabs={slabsForDialog}
                students={studentsForDialog}
              />
            )}
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {routes.length === 0
                      ? "Add routes first, then assign students."
                      : "No students assigned yet."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Class</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Route</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Stop</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Distance</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Slab</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Monthly Fee</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAssignments.map((a) => {
                      const fee = a.feeAmount ?? a.slab?.amount ?? null;
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {a.student.user?.name ?? `${a.student.firstName} ${a.student.lastName}`}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {a.student.class.name}
                            {a.student.section ? ` – ${a.student.section.name}` : ""}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{a.route.routeName}</td>
                          <td className="px-4 py-3 text-gray-500">{a.stopName ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {a.distanceKm != null ? `${a.distanceKm} km` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {a.slab ? (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                {a.slab.label}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">
                            {fee != null ? `₹${fee.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <AssignStudentDialog
                              routes={routesForDialog}
                              slabs={slabsForDialog}
                              students={studentsForDialog}
                              assignment={{
                                id: a.id,
                                studentId: a.studentId,
                                routeId: a.routeId,
                                slabId: a.slabId,
                                stopName: a.stopName,
                                distanceKm: a.distanceKm,
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FEE SUMMARY ── */}
      {tab === "summary" && (() => {
        // By class
        const classMap = new Map<string, { className: string; count: number; monthly: number }>();
        for (const a of assignments) {
          const cls = a.student.class.name;
          if (!classMap.has(cls)) classMap.set(cls, { className: cls, count: 0, monthly: 0 });
          const row = classMap.get(cls)!;
          row.count += 1;
          row.monthly += a.feeAmount ?? a.slab?.amount ?? 0;
        }
        const classRows = Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className));

        // By slab
        const slabMap = new Map<string, { label: string; amount: number; count: number }>();
        for (const s of slabs) slabMap.set(s.id, { label: s.label, amount: s.amount, count: 0 });
        for (const a of assignments) {
          if (a.slabId && slabMap.has(a.slabId)) slabMap.get(a.slabId)!.count++;
        }

        // By route
        const routeMap = new Map<string, { routeName: string; count: number; monthly: number }>();
        for (const r of routes) routeMap.set(r.id, { routeName: r.routeName, count: 0, monthly: 0 });
        for (const a of assignments) {
          if (routeMap.has(a.routeId)) {
            const row = routeMap.get(a.routeId)!;
            row.count++;
            row.monthly += a.feeAmount ?? a.slab?.amount ?? 0;
          }
        }

        return (
          <div className="grid grid-cols-3 gap-4">
            {/* By slab */}
            <Card className="border-0 shadow-sm col-span-1">
              <CardHeader className="pb-3"><CardTitle className="text-sm">By Distance Slab</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Slab</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Fee</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Students</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {Array.from(slabMap.values()).map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 text-xs">{s.label}</td>
                        <td className="px-4 py-2 text-right text-xs text-gray-600">₹{s.amount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">{s.count}</td>
                      </tr>
                    ))}
                    {slabs.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-xs text-gray-400 text-center">No slabs</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* By route */}
            <Card className="border-0 shadow-sm col-span-1">
              <CardHeader className="pb-3"><CardTitle className="text-sm">By Route</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Route</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Students</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Monthly</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {Array.from(routeMap.values()).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 text-xs">{r.routeName}</td>
                        <td className="px-4 py-2 text-right text-xs text-gray-600">{r.count}</td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">₹{r.monthly.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                    {routes.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-xs text-gray-400 text-center">No routes</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* By class */}
            <Card className="border-0 shadow-sm col-span-1">
              <CardHeader className="pb-3"><CardTitle className="text-sm">By Class</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Class</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Students</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Monthly</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {classRows.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 text-xs">{c.className}</td>
                        <td className="px-4 py-2 text-right text-xs text-gray-600">{c.count}</td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">₹{c.monthly.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                    {classRows.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-xs text-gray-400 text-center">No assignments</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Grand totals */}
            <div className="col-span-3 grid grid-cols-3 gap-4">
              <StatCard title="Total Students"   value={String(assignments.length)}                         subtitle="On transport" icon={<Users className="w-4 h-4" />}          color="blue" />
              <StatCard title="Monthly Revenue"  value={`₹${totalFeeMonthly.toLocaleString("en-IN")}`}     subtitle="Per month"    icon={<IndianRupee className="w-4 h-4" />}    color="green" />
              <StatCard title="Annual Revenue"   value={`₹${totalFeeAnnual.toLocaleString("en-IN")}`}      subtitle="Per year"     icon={<IndianRupee className="w-4 h-4" />}    color="orange" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
