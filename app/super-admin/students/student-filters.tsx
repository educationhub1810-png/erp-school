"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useState } from "react";

interface School {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export function StudentFilters({ schools, classes }: { schools: School[]; classes: Class[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [schoolId, setSchoolId] = useState(searchParams.get("schoolId") ?? "");
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [sectionId, setSectionId] = useState(searchParams.get("sectionId") ?? "");

  const selectedClass = classes.find((c) => c.id === classId);

  const apply = useCallback((overrides?: { schoolId?: string; classId?: string; sectionId?: string }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const nextSchoolId = overrides?.schoolId ?? schoolId;
    const nextClassId = overrides?.classId ?? classId;
    const nextSectionId = overrides?.sectionId ?? sectionId;
    if (nextSchoolId) params.set("schoolId", nextSchoolId);
    if (nextClassId) params.set("classId", nextClassId);
    if (nextSectionId) params.set("sectionId", nextSectionId);
    router.push(`?${params.toString()}`);
  }, [search, schoolId, classId, sectionId, router]);

  const clear = () => {
    setSearch("");
    setSchoolId("");
    setClassId("");
    setSectionId("");
    router.push("?");
  };

  const hasFilters = search || schoolId || classId || sectionId;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, admission no..."
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
          setClassId("");
          setSectionId("");
          apply({ schoolId: next, classId: "", sectionId: "" });
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

      {schoolId && (
        <Select value={classId} onValueChange={(v) => { const next = !v || v === "all" ? "" : v; setClassId(next); setSectionId(""); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Classes">
              {(value: string) => {
                if (!value || value === "all") return "All Classes";
                return classes.find((cls) => cls.id === value)?.name ?? "All Classes";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedClass && selectedClass.sections.length > 0 && (
        <Select value={sectionId} onValueChange={(v) => setSectionId(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="All Sections">
              {(value: string) => {
                if (!value || value === "all") return "All";
                const section = selectedClass.sections.find((sec) => sec.id === value);
                return section ? `Section ${section.name}` : "All";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {selectedClass.sections.map((sec) => (
              <SelectItem key={sec.id} value={sec.id}>Section {sec.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
