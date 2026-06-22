"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FREQUENCIES: { value: string; label: string }[] = [
  { value: "ONE_TIME", label: "One Time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
];

const schema = z.object({
  feeType: z.string().min(1, "Fee type is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  classId: z.string().optional(),
  dueDate: z.string().optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClassOption { id: string; name: string }

interface Props {
  classes: ClassOption[];
}

export function CreateFeeStructureDialog({ classes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: "MONTHLY" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add fee structure");
        return;
      }
      toast.success("Fee structure added successfully");
      reset({ frequency: "MONTHLY" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ frequency: "MONTHLY" }); }}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="w-4 h-4 mr-2" /> Add Fee Structure
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <Input placeholder="Tuition Fee" {...register("feeType")} />
            {errors.feeType && <p className="text-xs text-red-500">{errors.feeType.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input type="number" min={0} {...register("amount", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Frequency *</Label>
              <Select value={watch("frequency")} onValueChange={(v) => { if (v == null) return; setValue("frequency", v as FormValues["frequency"]); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => FREQUENCIES.find((f) => f.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Applies To Class</Label>
              <Select value={watch("classId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("classId", v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All classes">
                    {(value: string) => classes.find((c) => c.id === value)?.name ?? "All classes"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePicker value={watch("dueDate")} onChange={(v) => setValue("dueDate", v)} placeholder="Select due date" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} {...register("description")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Fee Structure
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
