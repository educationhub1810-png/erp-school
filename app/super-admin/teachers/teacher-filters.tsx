"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface School {
  id: string;
  name: string;
  code: string;
}

export function TeacherFilters({ schools }: { schools: School[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [schoolId, setSchoolId] = useState(searchParams.get("schoolId") ?? "");

  const apply = (overrides?: { schoolId?: string }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const nextSchoolId = overrides?.schoolId ?? schoolId;
    if (nextSchoolId) params.set("schoolId", nextSchoolId);
    router.push(`?${params.toString()}`);
  };

  const clear = () => {
    setSearch("");
    setSchoolId("");
    router.push("?");
  };

  const hasFilters = search || schoolId;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="pl-9"
        />
      </div>

      <Select
        value={schoolId}
        onValueChange={(v) => {
          const next = !v || v === "all" ? "" : v;
          setSchoolId(next);
          apply({ schoolId: next });
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All Schools">
            {(value: string) => {
              if (!value || value === "all") return "All Schools";
              return schools.find((s) => s.id === value)?.name ?? "All Schools";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Schools</SelectItem>
          {schools.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={() => apply()} className="bg-indigo-600 hover:bg-indigo-700">
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
