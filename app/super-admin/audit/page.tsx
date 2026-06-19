import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { AuditActivityChart } from "@/components/dashboard/audit-activity-chart";
import { actionMeta, AUDIT_FILTERABLE_ACTIONS, type AuditCategory } from "@/lib/audit-actions";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  LogIn, ShieldAlert, Users, Eye, Trash2, Activity, Globe, AlertTriangle,
} from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string; action?: string }>;
}

const DELETE_ACTIONS = ["STUDENT_DELETE", "TEACHER_DELETE", "STAFF_DELETE", "PARENT_DELETE", "BUG_DELETE"];
const CHART_DAYS = 14;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_STYLE: Record<AuditCategory, { label: string; bar: string }> = {
  AUTH: { label: "Authentication", bar: "bg-blue-500" },
  SECURITY: { label: "Security", bar: "bg-amber-500" },
  DATA: { label: "Data changes", bar: "bg-orange-500" },
};

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fullTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SuperAdminAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const limit = 25;
  const skip = (page - 1) * limit;
  const actionFilter = AUDIT_FILTERABLE_ACTIONS.includes(sp.action as never) ? sp.action : undefined;

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const chartStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (CHART_DAYS - 1));

  const where: Prisma.AuditLogWhereInput = actionFilter ? { action: actionFilter } : {};

  const [
    logins24h,
    failed24h,
    impersonations7d,
    destructive7d,
    totalEvents,
    activeActors,
    loginEvents,
    breakdown,
    recentFailures,
    logs,
    logCount,
  ] = await Promise.all([
    prisma.auditLog.count({ where: { action: "LOGIN_SUCCESS", createdAt: { gte: since24h } } }),
    prisma.auditLog.count({ where: { action: "LOGIN_FAILURE", createdAt: { gte: since24h } } }),
    prisma.auditLog.count({ where: { action: "IMPERSONATE_TOKEN_ISSUED", createdAt: { gte: since7d } } }),
    prisma.auditLog.count({ where: { action: { in: DELETE_ACTIONS }, createdAt: { gte: since7d } } }),
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ["actorId"],
      where: { action: "LOGIN_SUCCESS", createdAt: { gte: since24h }, actorId: { not: null } },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILURE"] }, createdAt: { gte: chartStart } },
      select: { action: true, createdAt: true },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.auditLog.findMany({
      where: { action: "LOGIN_FAILURE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, ip: true, metadata: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, action: true, actorId: true, actorRole: true,
        targetType: true, targetId: true, metadata: true, ip: true, createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Resolve actor names for the visible log rows.
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is string => !!id))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  // Bucket login events into daily success/failure counts.
  const buckets = new Map<string, { success: number; failure: number }>();
  for (const e of loginEvents) {
    const key = `${e.createdAt.getFullYear()}-${e.createdAt.getMonth()}-${e.createdAt.getDate()}`;
    const b = buckets.get(key) ?? { success: 0, failure: 0 };
    if (e.action === "LOGIN_SUCCESS") b.success++;
    else b.failure++;
    buckets.set(key, b);
  }
  const chartData = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date(chartStart.getFullYear(), chartStart.getMonth(), chartStart.getDate() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const b = buckets.get(key) ?? { success: 0, failure: 0 };
    return { label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, success: b.success, failure: b.failure };
  });

  // Category breakdown from the all-time per-action counts.
  const catCounts: Record<AuditCategory, number> = { AUTH: 0, SECURITY: 0, DATA: 0 };
  for (const row of breakdown) {
    catCounts[actionMeta(row.action).category] += row._count._all;
  }
  const catTotal = Object.values(catCounts).reduce((a, b) => a + b, 0) || 1;

  const totalPages = Math.ceil(logCount / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit &amp; Security</h1>
        <p className="text-sm text-gray-500 mt-1">
          Login activity, account access, and security-sensitive actions across the platform
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Logins (24h)" value={logins24h} subtitle="Successful sign-ins" icon={<LogIn className="w-5 h-5" />} color="green" />
        <StatCard title="Failed Logins (24h)" value={failed24h} subtitle="Unauthorized attempts" icon={<ShieldAlert className="w-5 h-5" />} color="red" />
        <StatCard title="Active Accounts (24h)" value={activeActors.length} subtitle="Distinct users signed in" icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="Impersonations (7d)" value={impersonations7d} subtitle="Admin access tokens" icon={<Eye className="w-5 h-5" />} color="orange" />
        <StatCard title="Deletions (7d)" value={destructive7d} subtitle="Records removed" icon={<Trash2 className="w-5 h-5" />} color="purple" />
        <StatCard title="Total Events" value={totalEvents} subtitle="All-time audit entries" icon={<Activity className="w-5 h-5" />} color="indigo" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Login Activity · Last {CHART_DAYS} Days</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditActivityChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Event Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {(Object.keys(CATEGORY_STYLE) as AuditCategory[]).map((cat) => {
              const count = catCounts[cat];
              const pct = Math.round((count / catTotal) * 100);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{CATEGORY_STYLE[cat].label}</span>
                    <span className="text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${CATEGORY_STYLE[cat].bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Security alerts — unauthorized / failed login attempts */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" /> Unauthorized Login Attempts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentFailures.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No failed login attempts recorded. 🎉</p>
          ) : (
            <div className="divide-y">
              {recentFailures.map((f) => {
                const meta = parseMeta(f.metadata);
                const username = typeof meta.username === "string" ? meta.username : "unknown";
                return (
                  <div key={f.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Failed sign-in for <span className="font-mono">{username}</span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {f.ip ?? "unknown IP"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0" title={fullTime(f.createdAt)}>
                      {timeAgo(f.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full activity log */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" /> Activity Log
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <a
              href="/super-admin/audit"
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !actionFilter ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              All
            </a>
            {AUDIT_FILTERABLE_ACTIONS.map((a) => (
              <a
                key={a}
                href={`/super-admin/audit?action=${a}`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  actionFilter === a ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {actionMeta(a).label}
              </a>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No audit entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Event</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Actor</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Target</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">IP</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => {
                    const meta = actionMeta(log.action);
                    const actor = log.actorId ? actorMap.get(log.actorId) : undefined;
                    const md = parseMeta(log.metadata);
                    const failUser = log.action === "LOGIN_FAILURE" && typeof md.username === "string" ? md.username : null;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
                            {meta.label}
                          </span>
                          {md.impersonation === true && (
                            <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              via impersonation
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {actor ? (
                            <div>
                              <p className="font-medium text-gray-900">{actor.name}</p>
                              <p className="text-xs text-gray-400">
                                {log.actorRole ? ROLE_LABELS[log.actorRole as AppRole] ?? log.actorRole : actor.email ?? ""}
                              </p>
                            </div>
                          ) : failUser ? (
                            <span className="font-mono text-gray-500">{failUser}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {log.targetType ? (
                            <span>{log.targetType}{log.targetId ? <span className="text-xs text-gray-400"> · {log.targetId.slice(0, 8)}</span> : null}</span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">{log.ip ?? "—"}</td>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap" title={fullTime(log.createdAt)}>
                          {timeAgo(log.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={logCount}
        limit={limit}
        skip={skip}
        queryString={actionFilter ? `action=${actionFilter}` : ""}
      />
    </div>
  );
}
