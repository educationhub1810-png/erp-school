"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, LogIn, Loader2 } from "lucide-react";
import { ROLE_DASHBOARDS, ROLE_LABELS, type AppRole } from "@/lib/roles";

interface School { id: string; name: string; code: string; }
interface UserItem {
  id: string; name: string; email?: string | null; mobile?: string | null;
  role: string; student?: { admissionNumber: string } | null;
}

const ROLES: AppRole[] = [
  "SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER",
  "STUDENT", "ACCOUNTANT", "LIBRARIAN",
];

export function ImpersonateForm({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId] = useState("");
  const [role, setRole] = useState<AppRole>("STUDENT");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userId, setUserId] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    setUsersLoading(true);
    setUserId("");
    const params = new URLSearchParams({ role });
    if (schoolId) params.set("schoolId", schoolId);
    fetch(`/api/admin-access/users?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [schoolId, role]);

  const handleLogin = async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin-access/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed"); return; }

      const { token, role: userRole } = json.data;
      const result = await signIn("credentials", { impersonateToken: token, redirect: false });
      if (!result?.ok || result.error) {
        setError("Login failed. Token may have expired — try again.");
        return;
      }
      window.location.href = ROLE_DASHBOARDS[userRole as AppRole] ?? "/";
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === userId);

  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="pt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* School */}
        <div className="space-y-1.5">
          <Label>School</Label>
          <div className="relative">
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— All / Super Admin —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label>Role</Label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* User */}
        <div className="space-y-1.5">
          <Label>User {usersLoading && <span className="text-gray-400 text-xs">(loading…)</span>}</Label>
          <div className="relative">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={usersLoading || users.length === 0}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">
                {usersLoading ? "Loading…" : users.length === 0 ? "No users found" : "Select a user"}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.student?.admissionNumber ? ` (${u.student.admissionNumber})` : u.email ? ` (${u.email})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {users.length > 0 && <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""} found</p>}
        </div>

        <Button
          onClick={handleLogin}
          disabled={!userId || loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4 mr-2" />
          )}
          {selectedUser ? `Login as ${selectedUser.name}` : "Select a user"}
        </Button>
      </CardContent>
    </Card>
  );
}
