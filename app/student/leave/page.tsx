"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  fromDate: z.string().min(1, "Required"),
  toDate:   z.string().min(1, "Required"),
  reason:   z.string().min(5, "Please provide a reason"),
});

type FormValues = z.infer<typeof schema>;

export default function StudentLeavePage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, leaveType: "PERSONAL" }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to submit"); return; }
      toast.success("Leave application submitted");
      reset();
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Apply for leave and track status</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" /> Apply for Leave
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Leave Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>From Date *</Label>
                  <Input type="date" {...register("fromDate")} />
                  {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>To Date *</Label>
                  <Input type="date" {...register("toDate")} />
                  {errors.toDate && <p className="text-xs text-red-500">{errors.toDate.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason *</Label>
                <Textarea rows={3} placeholder="Describe the reason for leave..." {...register("reason")} />
                {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Application
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" /> My Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No leave applications yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
