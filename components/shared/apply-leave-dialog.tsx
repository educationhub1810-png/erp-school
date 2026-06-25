"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS, daysBetweenInclusive } from "@/lib/leave";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z
  .object({
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().min(1, "To date is required"),
    leaveType: z.enum(LEAVE_TYPES as unknown as [string, ...string[]]),
    reason: z.string().min(5, "Please provide a reason"),
  })
  .refine((data) => new Date(data.toDate) >= new Date(data.fromDate), {
    message: "To date must be on or after the from date",
    path: ["toDate"],
  });

type FormValues = z.infer<typeof schema>;

export function ApplyLeaveDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" },
  });

  const fromDate = watch("fromDate");
  const toDate = watch("toDate");
  const dayCount = fromDate && toDate && new Date(toDate) >= new Date(fromDate)
    ? daysBetweenInclusive(new Date(fromDate), new Date(toDate))
    : null;

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to submit leave application");
        return;
      }
      toast.success("Leave application submitted");
      reset({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" }); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Apply for Leave
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From Date *</Label>
              <DatePicker value={watch("fromDate")} onChange={(v) => setValue("fromDate", v)} placeholder="Select from date" />
              {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>To Date *</Label>
              <DatePicker value={watch("toDate")} onChange={(v) => setValue("toDate", v)} placeholder="Select to date" />
              {errors.toDate && <p className="text-xs text-red-500">{errors.toDate.message}</p>}
            </div>
          </div>
          {dayCount != null && <p className="text-xs text-gray-500">{dayCount} day{dayCount > 1 ? "s" : ""}</p>}

          <div className="space-y-1.5">
            <Label>Leave Type *</Label>
            <Select value={watch("leaveType")} onValueChange={(v) => { if (v == null) return; setValue("leaveType", v); }}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: string) => LEAVE_TYPE_LABELS[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Textarea rows={3} placeholder="Describe the reason for leave..." {...register("reason")} />
            {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
