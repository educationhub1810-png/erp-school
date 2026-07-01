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
import { optionalTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";
import { installmentCount, periodOptions } from "@/lib/fees";

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "CASH",   label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "NEFT",   label: "NEFT" },
  { value: "UPI",    label: "UPI" },
  { value: "CARD",   label: "Card" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "PAID",    label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PENDING", label: "Pending" },
  { value: "OVERDUE", label: "Overdue" },
];

const schema = z.object({
  studentId:      z.string().min(1, "Student is required"),
  feeStructureId: z.string().min(1, "Fee structure is required"),
  amountPaid:     z.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  paymentDate:    z.string().optional(),
  paymentMode:    z.enum(["CASH", "CHEQUE", "ONLINE", "NEFT", "UPI", "CARD"]),
  transactionId:  optionalTextField("Transaction ID"),
  status:         z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]),
  periodLabel:    z.string().max(100).optional(),
  remarks:        optionalLongTextField("Remarks"),
});

type FormValues = z.infer<typeof schema>;

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  class: { name: string } | null;
  section: { name: string } | null;
}

interface FeeStructureOption {
  id: string;
  feeType: string;
  amount: number;
  frequency: string;
  installments?: { period: string; dueDate?: string }[] | null;
  monthlyDueDay?: number | null;
}

interface ExistingPayment {
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  status: string;
}

interface Props {
  students: StudentOption[];
  feeStructures: FeeStructureOption[];
  existingPayments?: ExistingPayment[];
}

function computeRemaining(
  studentId: string,
  feeStructureId: string,
  feeStructure: FeeStructureOption | undefined,
  payments: ExistingPayment[],
): number | null {
  if (!feeStructure || !studentId || !feeStructureId) return null;
  const totalPaid = payments
    .filter(
      (p) =>
        p.studentId === studentId &&
        p.feeStructureId === feeStructureId &&
        (p.status === "PAID" || p.status === "PARTIAL"),
    )
    .reduce((s, p) => s + p.amountPaid, 0);
  const totalExpected = feeStructure.amount * installmentCount(feeStructure.frequency);
  return Math.max(0, totalExpected - totalPaid);
}

export function RecordFeePaymentDialog({ students, feeStructures, existingPayments = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMode: "CASH", status: "PAID" },
  });

  const selectedStudentId     = watch("studentId");
  const selectedFeeStructureId = watch("feeStructureId");
  const selectedStructure     = feeStructures.find((f) => f.id === selectedFeeStructureId);
  const remaining             = computeRemaining(selectedStudentId, selectedFeeStructureId, selectedStructure, existingPayments);

  // Period options: prefer installment labels from the structure, fall back to generated list
  const periods: string[] = selectedStructure
    ? (selectedStructure.installments?.map((i) => i.period) ??
       periodOptions(selectedStructure.frequency))
    : [];

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to record payment"); return; }
      toast.success(`Payment recorded — receipt ${json.data.receiptNumber}`);
      reset({ paymentMode: "CASH", status: "PAID" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ paymentMode: "CASH", status: "PAID" }); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Record Payment
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Student */}
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select
              value={watch("studentId") ?? ""}
              onValueChange={(v) => { if (v == null) return; setValue("studentId", v, { shouldValidate: true }); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select student">
                  {(value: string) => {
                    const s = students.find((st) => st.id === value);
                    return s
                      ? `${s.firstName} ${s.lastName}${s.class ? ` (${s.class.name}${s.section ? `-${s.section.name}` : ""})` : ""}`
                      : "Select student";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                    {s.class ? ` (${s.class.name}${s.section ? `-${s.section.name}` : ""})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.studentId && <p className="text-xs text-red-500">{errors.studentId.message}</p>}
          </div>

          {/* Fee Structure */}
          <div className="space-y-1.5">
            <Label>Fee Structure *</Label>
            <Select
              value={watch("feeStructureId") ?? ""}
              onValueChange={(v) => {
                if (v == null) return;
                setValue("feeStructureId", v, { shouldValidate: true });
                setValue("periodLabel", "");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fee structure">
                  {(value: string) => {
                    const f = feeStructures.find((fs) => fs.id === value);
                    return f ? `${f.feeType} — ₹${f.amount.toLocaleString("en-IN")} / installment` : "Select fee structure";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {feeStructures.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.feeType} — ₹{f.amount.toLocaleString("en-IN")} / installment
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.feeStructureId && <p className="text-xs text-red-500">{errors.feeStructureId.message}</p>}
          </div>

          {/* Live remaining balance */}
          {selectedStructure && remaining !== null && (
            <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-2.5 text-sm">
              <span className="text-gray-600">
                Total obligation: ₹{(selectedStructure.amount * installmentCount(selectedStructure.frequency)).toLocaleString("en-IN")}
              </span>
              <span className={remaining > 0 ? "font-semibold text-red-600" : "text-green-600 font-semibold"}>
                {remaining > 0 ? `Balance: ₹${remaining.toLocaleString("en-IN")}` : "Fully paid ✓"}
              </span>
            </div>
          )}

          {/* Period */}
          {selectedStructure && selectedStructure.frequency !== "ONE_TIME" && (
            <div className="space-y-1.5">
              <Label>Payment Period</Label>
              {periods.length > 0 ? (
                <Select
                  value={watch("periodLabel") ?? ""}
                  onValueChange={(v) => { if (v == null) return; setValue("periodLabel", v); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select period">
                      {(value: string) => value || "Select period"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="e.g. January 2025, Q1 Apr–Jun 2025" maxLength={100} {...register("periodLabel")} />
              )}
              <p className="text-xs text-gray-400">Appears on the receipt so the parent knows which period this payment covers.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount Paid (₹) *</Label>
              <Input
                type="number" min={0} max={10_000_000}
                {...register("amountPaid", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })}
              />
              {errors.amountPaid && <p className="text-xs text-red-500">{errors.amountPaid.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <DatePicker value={watch("paymentDate")} onChange={(v) => setValue("paymentDate", v)} placeholder="Select date" />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Mode *</Label>
              <Select
                value={watch("paymentMode")}
                onValueChange={(v) => { if (v == null) return; setValue("paymentMode", v as FormValues["paymentMode"]); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => PAYMENT_MODES.find((m) => m.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => { if (v == null) return; setValue("status", v as FormValues["status"]); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => STATUSES.find((s) => s.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction ID</Label>
            <Input placeholder="Optional reference number" maxLength={FIELD_MAX.shortText} {...register("transactionId")} />
            {errors.transactionId && <p className="text-xs text-red-500">{errors.transactionId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={2} maxLength={FIELD_MAX.longText} {...register("remarks")} />
            {errors.remarks && <p className="text-xs text-red-500">{errors.remarks.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
