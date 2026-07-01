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
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { optionalTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";
import { periodOptions } from "@/lib/fees";

const PAYMENT_MODES = [
  { value: "CASH",   label: "Cash"   },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "NEFT",   label: "NEFT"   },
  { value: "UPI",    label: "UPI"    },
  { value: "CARD",   label: "Card"   },
];

const STATUSES = [
  { value: "PAID",      label: "Paid"      },
  { value: "PARTIAL",   label: "Partial"   },
  { value: "PENDING",   label: "Pending"   },
  { value: "OVERDUE",   label: "Overdue"   },
  { value: "CANCELLED", label: "Cancelled" },
];

const schema = z.object({
  amountPaid:    z.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  paymentDate:   z.string().optional(),
  paymentMode:   z.enum(["CASH", "CHEQUE", "ONLINE", "NEFT", "UPI", "CARD"]),
  transactionId: optionalTextField("Transaction ID"),
  status:        z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]),
  periodLabel:   z.string().max(100).optional(),
  remarks:       optionalLongTextField("Remarks"),
});

type FormValues = z.infer<typeof schema>;

export interface EditablePayment {
  id: string;
  amountPaid: number;
  paymentDate?: string | null;
  paymentMode: string;
  transactionId?: string | null;
  status: string;
  periodLabel?: string | null;
  remarks?: string | null;
  feeStructureFrequency?: string;
  feeStructureInstallments?: { period: string }[] | null;
}

interface Props {
  payment: EditablePayment;
}

export function EditFeePaymentDialog({ payment }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaults: Partial<FormValues> = {
    amountPaid:    payment.amountPaid,
    paymentDate:   payment.paymentDate ? new Date(payment.paymentDate).toISOString().split("T")[0] : undefined,
    paymentMode:   payment.paymentMode as FormValues["paymentMode"],
    transactionId: payment.transactionId ?? undefined,
    status:        payment.status as FormValues["status"],
    periodLabel:   payment.periodLabel ?? undefined,
    remarks:       payment.remarks ?? undefined,
  };

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const periods: string[] =
    payment.feeStructureInstallments?.map((i) => i.period) ??
    periodOptions(payment.feeStructureFrequency ?? "ONE_TIME");

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/fees/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to update payment"); return; }
      toast.success("Payment updated");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) reset(defaults);
    }}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="h-7 w-7" />}>
        <Pencil className="w-3.5 h-3.5" />
        <span className="sr-only">Edit payment</span>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Period */}
          {payment.feeStructureFrequency && payment.feeStructureFrequency !== "ONE_TIME" && (
            <div className="space-y-1.5">
              <Label>Payment Period</Label>
              {periods.length > 0 ? (
                <Select
                  value={watch("periodLabel") ?? ""}
                  onValueChange={(v) => { if (v != null) setValue("periodLabel", v); }}
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
                <Input placeholder="e.g. January 2025" maxLength={100} {...register("periodLabel")} />
              )}
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
                onValueChange={(v) => { if (v != null) setValue("paymentMode", v as FormValues["paymentMode"]); }}
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
                onValueChange={(v) => { if (v != null) setValue("status", v as FormValues["status"]); }}
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
            <Input maxLength={FIELD_MAX.shortText} {...register("transactionId")} />
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
