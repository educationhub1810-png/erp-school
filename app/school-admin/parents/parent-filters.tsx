"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface ClassOption {
  id: string;
  name: string;
}

export function ParentFilters({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");

  const apply = (overrides?: { classId?: string }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const nextClassId = overrides?.classId ?? classId;
    if (nextClassId) params.set("classId", nextClassId);
    router.push(`?${params.toString()}`);
  };

  const clear = () => {
    setSearch("");
    setClassId("");
    router.push("?");
  };

  const hasFilters = search || classId;

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
        value={classId}
        onValueChange={(v) => {
          const next = !v || v === "all" ? "" : v;
          setClassId(next);
          apply({ classId: next });
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All Classes">
            {(value: string) => {
              if (!value || value === "all") return "All Classes";
              return classes.find((c) => c.id === value)?.name ?? "All Classes";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
