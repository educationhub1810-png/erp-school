"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { IndianRupee, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_MODES = ["CASH", "ONLINE", "UPI", "NEFT", "CHEQUE", "CARD"] as const;

interface Props {
  studentId:      string;
  studentName:    string;
  feeStructureId: string;
  feeType:        string;
  balance:        number;
  frequency:      string;
  installments?:  { period: string }[] | null;
  monthlyDueDay?: number | null;
  schoolName:     string;
  schoolCode:     string;
}

interface PaymentResult {
  receiptNumber:  string;
  amountPaid:     number;
  paymentDate:    string | null;
  paymentMode:    string;
  status:         string;
  periodLabel?:   string | null;
}

async function downloadReceipt(receipt: PaymentResult, studentName: string, feeType: string, schoolName: string, schoolCode: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, w / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`School Code: ${schoolCode}`, w / 2, 19, { align: "center" });
  doc.text("FEE PAYMENT RECEIPT", w / 2, 25, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // Receipt number + date
  const dateStr = receipt.paymentDate
    ? new Date(receipt.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Receipt No: ${receipt.receiptNumber}`, 10, 36);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${dateStr}`, w - 10, 36, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 39, w - 10, 39);

  // Details
  const rows: [string, string][] = [
    ["Student Name",  studentName],
    ["Fee Type",      feeType],
    ["Period",        receipt.periodLabel ?? "—"],
    ["Payment Mode",  receipt.paymentMode],
    ["Status",        receipt.status],
  ];

  let y = 46;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, y);
    y += 7;
  }

  doc.line(10, y, w - 10, y);
  y += 6;

  // Amount
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`Amount Paid: Rs. ${Number(receipt.amountPaid).toLocaleString("en-IN")}`, w / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y += 10;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("This is a computer-generated receipt and does not require a signature.", w / 2, y, { align: "center" });

  doc.save(`receipt-${receipt.receiptNumber}.pdf`);
}

export function QuickPayDialog({
  studentId, studentName, feeStructureId, feeType, balance,
  frequency, installments, monthlyDueDay,
  schoolName, schoolCode,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(balance > 0 ? balance : ""));
  const [done, setDone] = useState<PaymentResult | null>(null);

  const periods = installments?.map((i) => i.period) ?? [];

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) { setDone(null); setAmount(String(balance > 0 ? balance : "")); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const paid = parseFloat(fd.get("amountPaid") as string);
    const status = paid >= balance ? "PAID" : "PARTIAL";
    const body = {
      studentId,
      feeStructureId,
      amountPaid:   paid,
      status,
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

    setDone({
      receiptNumber: data.data.receiptNumber,
      amountPaid:    data.data.amountPaid,
      paymentDate:   data.data.paymentDate,
      paymentMode:   data.data.paymentMode,
      status:        data.data.status,
      periodLabel:   data.data.periodLabel,
    });

    // Auto-download receipt
    await downloadReceipt(
      { ...data.data },
      studentName, feeType, schoolName, schoolCode,
    );

    router.refresh();
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        {/* ── Success state ── */}
        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-gray-900">Payment Recorded!</p>
              <p className="text-sm text-gray-500 mt-0.5">
                ₹{Number(done.amountPaid).toLocaleString("en-IN")} · {done.paymentMode} · {done.status}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Receipt: {done.receiptNumber}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => downloadReceipt(done, studentName, feeType, schoolName, schoolCode)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" /> Download Receipt
              </button>
              <DialogClose render={<button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700" />}>
                Done
              </DialogClose>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <>
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
                    name="amountPaid" type="number" step="0.01" min="0.01" max={balance || undefined}
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {parseFloat(amount) > 0 && parseFloat(amount) < balance && (
                    <p className="text-xs text-orange-500 mt-0.5">Will mark as Partial</p>
                  )}
                  {parseFloat(amount) >= balance && balance > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">Will mark as Paid ✓</p>
                  )}
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  {periods.length > 0 ? (
                    <select name="periodLabel"
                      className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Select —</option>
                      {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input name="periodLabel" placeholder={frequency === "MONTHLY" ? "e.g. April 2025" : "e.g. 2025–26"}
                      className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Transaction / Cheque No. <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input name="transactionId" placeholder="UTR / Cheque / DD number"
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Remarks <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input name="remarks"
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-2 pt-1">
                <DialogClose render={<button type="button" className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50" />}>
                  Cancel
                </DialogClose>
                <button type="submit" disabled={loading}
                  className="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                  {loading ? "Saving…" : "Record & Get Receipt"}
                </button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
