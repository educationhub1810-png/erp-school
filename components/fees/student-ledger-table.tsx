"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QuickPayDialog } from "@/components/fees/quick-pay-dialog";
import { Download, FileDown, Printer, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { expandDueEntries, buildPaymentEntries, ledgerTotals, type LedgerStructure, type LedgerPayment } from "@/lib/student-ledger";

interface FeeLine {
  feeStructureId: string;
  feeType:        string;
  frequency:      string;
  obligation:     number;
  paid:           number;
  balance:        number;
  installments?:  { period: string }[] | null;
  monthlyDueDay?: number | null;
}

interface StudentRow {
  studentId:        string;
  studentName:      string;
  className:        string;
  sectionName:      string | null;
  totalObligation:  number;
  totalPaid:        number;
  totalBalance:     number;
  lines:            FeeLine[];
  ledgerStructures: LedgerStructure[];
  ledgerPayments:   LedgerPayment[];
}

interface Props {
  rows:          StudentRow[];
  classes:       { id: string; name: string }[];
  filterClassId: string;
  search:        string;
  schoolName:    string;
  schoolCode:    string;
}

function downloadCSV(rows: StudentRow[]) {
  const headers = ["Student", "Class", "Fee Type", "Frequency", "Annual Due (Rs)", "Paid (Rs)", "Balance (Rs)"];
  const csvRows: string[][] = [headers];
  for (const r of rows) {
    for (const l of r.lines) {
      csvRows.push([
        r.studentName,
        r.className + (r.sectionName ? ` - ${r.sectionName}` : ""),
        l.feeType,
        l.frequency,
        String(l.obligation),
        String(l.paid),
        String(l.balance),
      ]);
    }
    csvRows.push([r.studentName, "", "TOTAL", "", String(r.totalObligation), String(r.totalPaid), String(r.totalBalance)]);
    csvRows.push([]);
  }
  const csv = csvRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fee-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

async function downloadStudentPDF(row: StudentRow, schoolName: string, schoolCode: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, w, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, w / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Code: ${schoolCode}`, w / 2, 20, { align: "center" });
  doc.text("STUDENT FEE LEDGER", w / 2, 27, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // Student info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Student: ${row.studentName}`, 14, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`Class: ${row.className}${row.sectionName ? ` – ${row.sectionName}` : ""}`, 14, 47);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, w - 14, 40, { align: "right" });

  // Summary band
  doc.setFillColor(245, 245, 255);
  doc.rect(14, 52, w - 28, 14, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Annual Due: Rs.${row.totalObligation.toLocaleString("en-IN")}`, 18, 60);
  doc.setTextColor(22, 163, 74);
  doc.text(`Paid: Rs.${row.totalPaid.toLocaleString("en-IN")}`, 90, 60);
  doc.setTextColor(row.totalBalance > 0 ? 220 : 100, row.totalBalance > 0 ? 0 : 100, 0);
  doc.text(`Balance: Rs.${row.totalBalance.toLocaleString("en-IN")}`, 150, 60);
  doc.setTextColor(0, 0, 0);

  // Table header
  let y = 74;
  doc.setFillColor(230, 230, 245);
  doc.rect(14, y - 5, w - 28, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const cols = [14, 80, 120, 148, 175];
  doc.text("Fee Type",    cols[0], y);
  doc.text("Frequency",  cols[1], y);
  doc.text("Annual Due", cols[2], y);
  doc.text("Paid",       cols[3], y);
  doc.text("Balance",    cols[4], y);

  doc.setFont("helvetica", "normal");
  y += 4;
  doc.setDrawColor(200, 200, 220);
  doc.line(14, y, w - 14, y);
  y += 5;

  for (const l of row.lines) {
    if (y > 272) { doc.addPage(); y = 20; }
    const freqLabel = l.frequency.charAt(0) + l.frequency.slice(1).toLowerCase().replace(/_/g, " ");
    doc.text(l.feeType.substring(0, 28), cols[0], y);
    doc.text(freqLabel, cols[1], y);
    doc.text(`Rs.${l.obligation.toLocaleString("en-IN")}`, cols[2], y);
    doc.setTextColor(22, 163, 74);
    doc.text(`Rs.${l.paid.toLocaleString("en-IN")}`, cols[3], y);
    doc.setTextColor(l.balance > 0 ? 220 : 100, l.balance > 0 ? 0 : 100, 0);
    doc.text(`Rs.${l.balance.toLocaleString("en-IN")}`, cols[4], y);
    doc.setTextColor(0, 0, 0);
    y += 7;
    doc.setDrawColor(235, 235, 235);
    doc.line(14, y - 3, w - 14, y - 3);
  }

  // Total row
  y += 2;
  doc.setFillColor(245, 245, 255);
  doc.rect(14, y - 5, w - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", cols[0], y);
  doc.text(`Rs.${row.totalObligation.toLocaleString("en-IN")}`, cols[2], y);
  doc.setTextColor(22, 163, 74);
  doc.text(`Rs.${row.totalPaid.toLocaleString("en-IN")}`, cols[3], y);
  doc.setTextColor(row.totalBalance > 0 ? 220 : 22, row.totalBalance > 0 ? 0 : 163, 0);
  doc.text(`Rs.${row.totalBalance.toLocaleString("en-IN")}`, cols[4], y);
  doc.setTextColor(0, 0, 0);

  y += 14;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("This is a system-generated statement.", w / 2, y, { align: "center" });

  doc.save(`ledger-${row.studentName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("PDF downloaded");
}

/** Two-column day-wise passbook ledger: due-date fee lines vs. payment
 * transactions, side by side, with a running "balance as on date" footer —
 * the register format schools traditionally hand out to parents. */
async function printStudentLedgerPassbook(row: StudentRow, schoolName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - marginX * 2;
  const colRatios = [0.13, 0.20, 0.11, 0.13, 0.20, 0.11, 0.12];
  const cols = colRatios.map((r) => r * tableWidth);
  const xs: number[] = [];
  let acc = marginX;
  for (const w of cols) { xs.push(acc); acc += w; }
  const rowH = 7;

  const asOf = new Date();
  const due = expandDueEntries(row.ledgerStructures, asOf);
  const paid = buildPaymentEntries(row.ledgerPayments, asOf);
  const { totalDue, totalPaid, balance } = ledgerTotals(due, paid);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB");

  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text(`LEDGER FOR STUDENT ${row.studentName.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  const drawRow = (cells: string[], opts?: { bold?: boolean; fill?: boolean }) => {
    if (y + rowH > 285) { doc.addPage(); y = 20; }
    if (opts?.fill) {
      doc.setFillColor(235, 235, 245);
      doc.rect(marginX, y, tableWidth, rowH, "F");
    }
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(8);
    cells.forEach((c, i) => {
      doc.rect(xs[i], y, cols[i], rowH);
      doc.text(c, xs[i] + 1.5, y + 4.8, { maxWidth: cols[i] - 3 });
    });
    y += rowH;
  };

  drawRow(["DUE DATE", "FEES TYPE", "AMOUNT", "PAYMENT DATE", "FEES TYPE", "AMOUNT", "PAYMENT MODE"], { bold: true, fill: true });

  const maxRows = Math.max(due.length, paid.length);
  for (let i = 0; i < maxRows; i++) {
    const d = due[i];
    const p = paid[i];
    drawRow([
      d ? fmtDate(d.date) : "",
      d ? d.feeType : "",
      d ? String(d.amount) : "",
      p ? fmtDate(p.date) : "",
      p ? p.feeType : "",
      p ? String(p.amount) : "",
      p ? p.paymentMode.charAt(0) + p.paymentMode.slice(1).toLowerCase() : "",
    ]);
  }

  drawRow(["", "TOTAL", String(totalDue), "", "TOTAL", String(totalPaid), ""], { bold: true, fill: true });

  if (y + rowH * 2 > 285) { doc.addPage(); y = 20; }
  doc.setFillColor(255, 247, 230);
  doc.rect(marginX, y, tableWidth, rowH, "F");
  doc.rect(marginX, y, tableWidth, rowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`BALANCE TO BE PAID AS ON DATE ${fmtDate(asOf)}`, pageWidth / 2, y + 4.8, { align: "center" });
  y += rowH;
  doc.rect(marginX, y, tableWidth, rowH);
  doc.text(String(balance), pageWidth / 2, y + 4.8, { align: "center" });

  doc.save(`ledger-passbook-${row.studentName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("Ledger PDF downloaded");
}

export function StudentLedgerTable({ rows, classes, filterClassId, search, schoolName, schoolCode }: Props) {
  const [localSearch, setLocalSearch]   = useState(search);
  const [localClass, setLocalClass]     = useState(filterClassId);
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (localClass && r.className !== localClass) return false;
      if (localSearch && !r.studentName.toLowerCase().includes(localSearch.toLowerCase())) return false;
      return true;
    });
  }, [rows, localSearch, localClass]);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const grandDue     = filtered.reduce((s, r) => s + r.totalObligation, 0);
  const grandPaid    = filtered.reduce((s, r) => s + r.totalPaid, 0);
  const grandBalance = filtered.reduce((s, r) => s + r.totalBalance, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search student name…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={localClass}
          onChange={(e) => setLocalClass(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button
          onClick={() => downloadCSV(filtered)}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap"
        >
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Annual Due",  value: grandDue,     color: "text-gray-800" },
            { label: "Total Paid",  value: grandPaid,    color: "text-green-600" },
            { label: "Outstanding", value: grandBalance, color: grandBalance > 0 ? "text-red-600" : "text-gray-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>₹{s.value.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400">{filtered.length} students</p>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No students found.</p>
      )}

      {filtered.map((row) => {
        const isCollapsed = collapsed.has(row.studentId);
        const pct = row.totalObligation > 0
          ? Math.min(100, Math.round((row.totalPaid / row.totalObligation) * 100))
          : 0;

        return (
          <Card key={row.studentId} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Student header */}
              <div className={`flex items-center gap-3 px-4 py-3 border-b ${isCollapsed ? "bg-white" : "bg-gray-50"}`}>
                <button
                  onClick={() => toggleCollapse(row.studentId)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  {isCollapsed
                    ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{row.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {row.className}{row.sectionName ? ` – ${row.sectionName}` : ""}
                    </p>
                  </div>
                </button>

                {/* Progress bar */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                </div>

                {/* Amounts */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Due</p>
                    <p className="text-sm font-semibold text-gray-800">₹{row.totalObligation.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Paid</p>
                    <p className="text-sm font-semibold text-green-600">₹{row.totalPaid.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Balance</p>
                    <p className={`text-sm font-bold ${row.totalBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                      ₹{row.totalBalance.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadStudentPDF(row, schoolName, schoolCode)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors"
                    title="Download summary PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => printStudentLedgerPassbook(row, schoolName)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors"
                    title="Print day-wise ledger"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fee lines */}
              {!isCollapsed && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-400">Fee Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-400">Frequency</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-400">Annual Due</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-400">Paid</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-400">Balance</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-400 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {row.lines.map((l, i) => (
                      <tr key={i} className={`hover:bg-indigo-50/30 transition-colors ${l.balance === 0 ? "opacity-60" : ""}`}>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{l.feeType}</td>
                        <td className="px-4 py-2.5 text-gray-500 capitalize">
                          {l.frequency.toLowerCase().replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">₹{l.obligation.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right text-green-600 font-medium">₹{l.paid.toLocaleString("en-IN")}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${l.balance > 0 ? "text-red-600" : "text-gray-400"}`}>
                          ₹{l.balance.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {l.balance > 0 ? (
                            <QuickPayDialog
                              studentId={row.studentId}
                              studentName={row.studentName}
                              feeStructureId={l.feeStructureId}
                              feeType={l.feeType}
                              balance={l.balance}
                              frequency={l.frequency}
                              installments={l.installments}
                              monthlyDueDay={l.monthlyDueDay}
                              schoolName={schoolName}
                              schoolCode={schoolCode}
                            />
                          ) : (
                            <span className="text-green-600 font-medium">✓ Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
