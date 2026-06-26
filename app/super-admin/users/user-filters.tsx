"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";

interface School {
  id: string;
  name: string;
  code: string;
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as AppRole[]).filter((r) => r !== "SUPER_ADMIN");

// Sentinel school value for the platform-level "Super Admins" view (these
// accounts belong to no school). Kept in sync with PLATFORM_SCOPE in page.tsx.
const PLATFORM_SCOPE = "platform";

export function UserFilters({ schools }: { schools: School[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [role, setRole] = useState(searchParams.get("role") ?? "");
  const [schoolId, setSchoolId] = useState(searchParams.get("schoolId") ?? "");

  const apply = useCallback((overrides?: { role?: string; schoolId?: string }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const nextRole = overrides?.role ?? role;
    const nextSchoolId = overrides?.schoolId ?? schoolId;
    if (nextRole) params.set("role", nextRole);
    if (nextSchoolId) params.set("schoolId", nextSchoolId);
    router.push(`?${params.toString()}`);
  }, [search, role, schoolId, router]);

  const clear = () => {
    setSearch("");
    setRole("");
    setSchoolId("");
    router.push("?");
  };

  const hasFilters = search || role || schoolId;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">School<span className="text-red-500"> *</span></span>
        <Select
          value={schoolId}
          onValueChange={(v) => {
            const next = !v || v === "all" ? "" : v;
            setSchoolId(next);
            apply({ schoolId: next });
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a school">
              {(value: string) => {
                if (value === PLATFORM_SCOPE) return "Super Admins";
                if (!value || value === "all") return "Select a school";
                return schools.find((s) => s.id === value)?.name ?? "Select a school";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PLATFORM_SCOPE}>Super Admins (platform)</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          disabled={!schoolId}
          className="pl-9"
        />
      </div>

      <Select
        value={role}
        disabled={!schoolId}
        onValueChange={(v) => {
          const next = !v || v === "all" ? "" : v;
          setRole(next);
          apply({ role: next });
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All Roles">
            {(value: string) => {
              if (!value || value === "all") return "All Roles";
              return ROLE_LABELS[value as AppRole] ?? "All Roles";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {ROLE_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={() => apply()} disabled={!schoolId} className="bg-indigo-600 hover:bg-indigo-700">
        <Search className="w-4 h-4 mr-2" /> Search
      </Button>

      {hasFilters && (
        <Button variant="ghost" onClick={clear} size="icon">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
