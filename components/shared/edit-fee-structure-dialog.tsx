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
import { DatePicker } from "@/components/ui/date-picker";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requiredTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";

const QUARTERLY_PERIODS   = ["Q1 (Apr–Jun)", "Q2 (Jul–Sep)", "Q3 (Oct–Dec)", "Q4 (Jan–Mar)"];
const HALF_YEARLY_PERIODS = ["Apr–Sep (First Half)", "Oct–Mar (Second Half)"];

const schema = z.object({
  feeType:       requiredTextField("Fee type", FIELD_MAX.shortText),
  amount:        z.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  dueDate:       z.string().optional(),
  monthlyDueDay: z.number().int().min(1).max(31).optional(),
  installments:  z.array(z.object({ period: z.string(), dueDate: z.string().optional() })).optional(),
  description:   optionalLongTextField("Description"),
});

type FormValues = z.infer<typeof schema>;
type Installment = { period: string; dueDate?: string };

export interface EditableFeeStructure {
  id: string;
  feeType: string;
  amount: number;
  frequency: string;
  dueDate?: string | null;
  monthlyDueDay?: number | null;
  installments?: Installment[] | null;
  description?: string | null;
}

interface Props {
  structure: EditableFeeStructure;
}

export function EditFeeStructureDialog({ structure }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      feeType:       structure.feeType,
      amount:        structure.amount,
      dueDate:       structure.dueDate ? new Date(structure.dueDate).toISOString().split("T")[0] : undefined,
      monthlyDueDay: structure.monthlyDueDay ?? undefined,
      installments:  structure.installments ?? undefined,
      description:   structure.description ?? "",
    },
  });

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
      const res = await fetch(`/api/v1/fees/structures/${structure.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to update fee structure"); return; }
      toast.success("Fee structure updated");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const periodGroups: string[] =
    structure.frequency === "QUARTERLY"   ? QUARTERLY_PERIODS :
    structure.frequency === "HALF_YEARLY" ? HALF_YEARLY_PERIODS : [];

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) {
        reset({
          feeType:       structure.feeType,
          amount:        structure.amount,
          dueDate:       structure.dueDate ? new Date(structure.dueDate).toISOString().split("T")[0] : undefined,
          monthlyDueDay: structure.monthlyDueDay ?? undefined,
          installments:  structure.installments ?? undefined,
          description:   structure.description ?? "",
        });
      }
    }}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="h-7 w-7" />}>
        <Pencil className="w-3.5 h-3.5" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Fee Structure</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <Input maxLength={FIELD_MAX.shortText} {...register("feeType")} />
            {errors.feeType && <p className="text-xs text-red-500">{errors.feeType.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Amount per Installment (₹) *</Label>
            <Input
              type="number" min={0} max={10_000_000}
              {...register("amount", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Frequency-specific due-date fields */}
          {(structure.frequency === "ONE_TIME" || structure.frequency === "ANNUALLY") && (
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePicker value={watch("dueDate")} onChange={(v) => setValue("dueDate", v)} placeholder="Select due date" />
            </div>
          )}

          {structure.frequency === "MONTHLY" && (
            <div className="space-y-1.5">
              <Label>Due Day Each Month (1–31)</Label>
              <Input
                type="number" min={1} max={31}
                {...register("monthlyDueDay", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v) })}
              />
              {errors.monthlyDueDay && <p className="text-xs text-red-500">{errors.monthlyDueDay.message}</p>}
            </div>
          )}

          {periodGroups.length > 0 && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Installment Due Dates</p>
              {periodGroups.map((period, i) => (
                <div key={period} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <span className="text-sm text-gray-700">{period}</span>
                  <DatePicker
                    value={installments[i]?.dueDate}
                    onChange={(v) => setInstallmentDate(periodGroups, i, v)}
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
