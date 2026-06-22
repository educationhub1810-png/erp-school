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

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "NEFT", label: "NEFT" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PENDING", label: "Pending" },
  { value: "OVERDUE", label: "Overdue" },
];

const schema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeStructureId: z.string().min(1, "Fee structure is required"),
  amountPaid: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().optional(),
  paymentMode: z.enum(["CASH", "CHEQUE", "ONLINE", "NEFT", "UPI", "CARD"]),
  transactionId: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface StudentOption { id: string; firstName: string; lastName: string; class: { name: string } | null; section: { name: string } | null }
interface FeeStructureOption { id: string; feeType: string; amount: number }

interface Props {
  students: StudentOption[];
  feeStructures: FeeStructureOption[];
}

export function RecordFeePaymentDialog({ students, feeStructures }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMode: "CASH", status: "PAID" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to record payment");
        return;
      }
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={watch("studentId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("studentId", v, { shouldValidate: true }); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select student">
                  {(value: string) => {
                    const s = students.find((st) => st.id === value);
                    return s ? `${s.firstName} ${s.lastName} ${s.class ? `(${s.class.name}${s.section ? `-${s.section.name}` : ""})` : ""}` : "Select student";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} {s.class ? `(${s.class.name}${s.section ? `-${s.section.name}` : ""})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.studentId && <p className="text-xs text-red-500">{errors.studentId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Fee Structure *</Label>
            <Select value={watch("feeStructureId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("feeStructureId", v, { shouldValidate: true }); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fee structure">
                  {(value: string) => {
                    const f = feeStructures.find((fs) => fs.id === value);
                    return f ? `${f.feeType} (₹${f.amount})` : "Select fee structure";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {feeStructures.map((f) => <SelectItem key={f.id} value={f.id}>{f.feeType} (₹{f.amount})</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.feeStructureId && <p className="text-xs text-red-500">{errors.feeStructureId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount Paid (₹) *</Label>
              <Input type="number" min={0} {...register("amountPaid", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })} />
              {errors.amountPaid && <p className="text-xs text-red-500">{errors.amountPaid.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <DatePicker value={watch("paymentDate")} onChange={(v) => setValue("paymentDate", v)} placeholder="Select date" />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Mode *</Label>
              <Select value={watch("paymentMode")} onValueChange={(v) => { if (v == null) return; setValue("paymentMode", v as FormValues["paymentMode"]); }}>
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
              <Select value={watch("status")} onValueChange={(v) => { if (v == null) return; setValue("status", v as FormValues["status"]); }}>
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
            <Input placeholder="Optional reference number" {...register("transactionId")} />
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={2} {...register("remarks")} />
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
