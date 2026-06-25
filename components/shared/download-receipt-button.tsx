"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export interface ReceiptDetails {
  receiptNumber: string;
  studentName: string;
  feeType: string;
  amountPaid: number;
  remaining: number;
  paymentDate: string | null;
  paymentMode: string;
  status: string;
  schoolName: string;
  schoolCode: string;
}

// jsPDF's built-in fonts don't have a ₹ glyph, so the PDF itself uses "Rs."
// instead of the ₹ symbol used everywhere else in the UI.
async function generateReceiptPdf(receipt: ReceiptDetails) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const centerX = 105;

  doc.setFontSize(16);
  doc.text(receipt.schoolName, centerX, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`School Code: ${receipt.schoolCode}`, centerX, 27, { align: "center" });
  doc.setFontSize(13);
  doc.text("Fee Payment Receipt", centerX, 38, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(20, 43, 190, 43);

  doc.setFontSize(11);
  let y = 56;
  const row = (label: string, value: string) => {
    doc.text(label, 20, y);
    doc.text(value, 90, y);
    y += 9;
  };
  row("Receipt No:", receipt.receiptNumber);
  row("Date:", receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString("en-IN") : "—");
  row("Student Name:", receipt.studentName);
  row("Fee Type:", receipt.feeType);
  row("Amount Paid:", `Rs. ${receipt.amountPaid.toLocaleString("en-IN")}`);
  row("Payment Mode:", receipt.paymentMode);
  row("Status:", receipt.status);
  row("Remaining Balance:", `Rs. ${receipt.remaining.toLocaleString("en-IN")}`);

  doc.line(20, y + 2, 190, y + 2);
  doc.setFontSize(9);
  doc.text("This is a computer-generated receipt.", centerX, y + 12, { align: "center" });

  doc.save(`Receipt-${receipt.receiptNumber}.pdf`);
}

export function DownloadReceiptButton({ receipt }: { receipt: ReceiptDetails }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await generateReceiptPdf(receipt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleClick} disabled={loading} className="h-7 px-2 text-gray-500 hover:text-gray-900">
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
      Receipt
    </Button>
  );
}
