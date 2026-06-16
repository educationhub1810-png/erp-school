"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AcademicYear } from "@/lib/generated/prisma/client";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AcademicYearManager({ years }: { years: AcademicYear[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: false },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success("Academic year created");
      reset();
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Academic Years</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" /> Add Year
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-gray-50 rounded-lg space-y-3 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Year Name *</Label>
                  <Input placeholder="2025-26" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input type="date" {...register("startDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date *</Label>
                  <Input type="date" {...register("endDate")} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4" {...register("isActive")} />
                Set as active year
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                  {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
              </div>
            </form>
          )}

          {years.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No academic years configured</p>
          ) : (
            <div className="space-y-2">
              {years.map((year) => (
                <div key={year.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{year.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(year.startDate).toLocaleDateString("en-IN")} — {new Date(year.endDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Badge className={year.isActive
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                  }>
                    {year.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
