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
import { requiredTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";

const FREQUENCIES: { value: string; label: string }[] = [
  { value: "ONE_TIME",    label: "One Time" },
  { value: "MONTHLY",     label: "Monthly (12×)" },
  { value: "QUARTERLY",   label: "Quarterly (4×)" },
  { value: "HALF_YEARLY", label: "Half-Yearly (2×)" },
  { value: "ANNUALLY",    label: "Annually (1×)" },
];

const QUARTERLY_PERIODS   = ["Q1 (Apr–Jun)", "Q2 (Jul–Sep)", "Q3 (Oct–Dec)", "Q4 (Jan–Mar)"];
const HALF_YEARLY_PERIODS = ["Apr–Sep (First Half)", "Oct–Mar (Second Half)"];

const schema = z.object({
  feeType:       requiredTextField("Fee type", FIELD_MAX.shortText),
  amount:        z.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  classId:       z.string().optional(),
  frequency:     z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY"]),
  dueDate:       z.string().optional(),
  monthlyDueDay: z.number().int().min(1).max(31).optional(),
  installments:  z.array(z.object({ period: z.string(), dueDate: z.string().optional() })).optional(),
  description:   optionalLongTextField("Description"),
});

type FormValues = z.infer<typeof schema>;
type Installment = { period: string; dueDate?: string };

interface ClassOption { id: string; name: string }
interface Props { classes: ClassOption[] }

export function CreateFeeStructureDialog({ classes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: "MONTHLY" },
  });

  const frequency = watch("frequency");
  const installments = (watch("installments") ?? []) as Installment[];

  const setInstallmentDate = (periods: string[], i: number, dueDate: string) => {
    const next = periods.map((period, j) => ({
      period,
      dueDate: j === i ? dueDate : (installments[j]?.dueDate ?? ""),
    }));
    setValue("installments", next);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to add fee structure"); return; }
      toast.success("Fee structure added");
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
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <Input placeholder="Tuition Fee" maxLength={FIELD_MAX.shortText} {...register("feeType")} />
            {errors.feeType && <p className="text-xs text-red-500">{errors.feeType.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount per Installment (₹) *</Label>
              <Input
                type="number" min={0} max={10_000_000}
                {...register("amount", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Frequency *</Label>
              <Select
                value={frequency}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue("frequency", v as FormValues["frequency"]);
                  setValue("dueDate", undefined);
                  setValue("monthlyDueDay", undefined);
                  setValue("installments", undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => FREQUENCIES.find((f) => f.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Applies To Class</Label>
              <Select
                value={watch("classId") ?? ""}
                onValueChange={(v) => { if (v == null) return; setValue("classId", v || undefined); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All classes">
                    {(value: string) => classes.find((c) => c.id === value)?.name ?? "All classes"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due-date section — varies by frequency */}
          {(frequency === "ONE_TIME" || frequency === "ANNUALLY") && (
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePicker value={watch("dueDate")} onChange={(v) => setValue("dueDate", v)} placeholder="Select due date" />
            </div>
          )}

          {frequency === "MONTHLY" && (
            <div className="space-y-1.5">
              <Label>Due Day Each Month (1–31)</Label>
              <Input
                type="number" min={1} max={31} placeholder="10"
                {...register("monthlyDueDay", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v) })}
              />
              <p className="text-xs text-gray-400">
                Fees are due on this day every month — e.g. 10 = 10th of each month.
              </p>
              {errors.monthlyDueDay && <p className="text-xs text-red-500">{errors.monthlyDueDay.message}</p>}
            </div>
          )}

          {frequency === "QUARTERLY" && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Quarterly Due Dates</p>
              {QUARTERLY_PERIODS.map((period, i) => (
                <div key={period} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <span className="text-sm text-gray-700">{period}</span>
                  <DatePicker
                    value={installments[i]?.dueDate}
                    onChange={(v) => setInstallmentDate(QUARTERLY_PERIODS, i, v)}
                    placeholder="Due date"
                  />
                </div>
              ))}
            </div>
          )}

          {frequency === "HALF_YEARLY" && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Half-Yearly Due Dates</p>
              {HALF_YEARLY_PERIODS.map((period, i) => (
                <div key={period} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <span className="text-sm text-gray-700">{period}</span>
                  <DatePicker
                    value={installments[i]?.dueDate}
                    onChange={(v) => setInstallmentDate(HALF_YEARLY_PERIODS, i, v)}
                    placeholder="Due date"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} maxLength={FIELD_MAX.longText} {...register("description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
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
