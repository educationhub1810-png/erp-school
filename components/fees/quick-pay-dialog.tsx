"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { IndianRupee } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_MODES = ["CASH", "ONLINE", "CHEQUE", "DD", "UPI"] as const;

interface Props {
  studentId:       string;
  studentName:     string;
  feeStructureId:  string;
  feeType:         string;
  balance:         number;
  frequency:       string;
  installments?:   { period: string }[] | null;
  monthlyDueDay?:  number | null;
}

export function QuickPayDialog({
  studentId, studentName, feeStructureId, feeType, balance, frequency, installments, monthlyDueDay,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(balance > 0 ? balance : ""));

  const periods = installments?.map((i) => i.period) ?? [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const body = {
      studentId,
      feeStructureId,
      amountPaid:   parseFloat(fd.get("amountPaid") as string),
      paymentMode:  fd.get("paymentMode") as string,
      paymentDate:  fd.get("paymentDate") as string,
      transactionId: (fd.get("transactionId") as string) || undefined,
      periodLabel:  (fd.get("periodLabel") as string) || undefined,
      remarks:      (fd.get("remarks") as string) || undefined,
    };

    const res = await fetch("/api/v1/fees/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Payment failed"); return; }
    toast.success("Payment recorded");
    setOpen(false);
    router.refresh();
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          title={`Record payment for ${feeType}`}
        />
      }>
        <IndianRupee className="w-3 h-3" /> Pay
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-gray-500 -mt-1 mb-3">
          <span className="font-medium text-gray-800">{studentName}</span>
          {" · "}{feeType}
          {balance > 0 && (
            <span className="ml-1 text-red-600 font-medium">
              · Balance ₹{balance.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                name="amountPaid" type="number" step="0.01" min="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                name="paymentDate" type="date" defaultValue={today} required
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
              <select name="paymentMode" defaultValue="CASH"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {periods.length > 0 ? "Period" : frequency === "MONTHLY" ? "Month" : "Period"}
              </label>
              {periods.length > 0 ? (
                <select name="periodLabel"
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select period —</option>
                  {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input name="periodLabel" placeholder="e.g. April 2025"
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Transaction ID <span className="text-gray-400 font-normal">(optional)</span></label>
            <input name="transactionId" placeholder="UTR / Cheque / DD number"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks <span className="text-gray-400 font-normal">(optional)</span></label>
            <input name="remarks"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex gap-2 pt-1">
            <DialogClose render={<button type="button" className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50" />}>
              Cancel
            </DialogClose>
            <button type="submit" disabled={loading}
              className="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
