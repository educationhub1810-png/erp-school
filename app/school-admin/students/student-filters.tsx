"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useState } from "react";

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export function StudentFilters({ classes }: { classes: Class[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [sectionId, setSectionId] = useState(searchParams.get("sectionId") ?? "");

  const selectedClass = classes.find((c) => c.id === classId);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    router.push(`?${params.toString()}`);
  }, [search, classId, sectionId, router]);

  const clear = () => {
    setSearch("");
    setClassId("");
    setSectionId("");
    router.push("?");
  };

  const hasFilters = search || classId || sectionId;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, student code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="pl-9"
        />
      </div>

      <Select value={classId} onValueChange={(v) => { setClassId(!v || v === "all" ? "" : v); setSectionId(""); }}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedClass && selectedClass.sections.length > 0 && (
        <Select value={sectionId} onValueChange={(v) => setSectionId(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {selectedClass.sections.map((sec) => (
              <SelectItem key={sec.id} value={sec.id}>Section {sec.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button onClick={apply} className="bg-indigo-600 hover:bg-indigo-700">
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
