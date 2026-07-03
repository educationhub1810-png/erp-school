"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QuickPayDialog } from "@/components/fees/quick-pay-dialog";
import { Download, FileDown, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface FeeLine {
  feeStructureId: string;
  feeType: string;
  frequency: string;
  obligation: number;
  paid: number;
  balance: number;
  installments?: { period: string }[] | null;
  monthlyDueDay?: number | null;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  className: string;
  sectionName: string | null;
  totalObligation: number;
  totalPaid: number;
  totalBalance: number;
  lines: FeeLine[];
}

interface Props {
  rows: StudentRow[];
  classes: { id: string; name: string }[];
  filterClassId: string;
  search: string;
}

function downloadCSV(rows: StudentRow[]) {
  const headers = ["Student", "Class", "Fee Type", "Frequency", "Annual Due (₹)", "Paid (₹)", "Balance (₹)"];
  const csvRows: string[][] = [headers];
  for (const r of rows) {
    for (const l of r.lines) {
      csvRows.push([
        r.studentName,
        r.className + (r.sectionName ? ` – ${r.sectionName}` : ""),
        l.feeType,
        l.frequency,
        String(l.obligation),
        String(l.paid),
        String(l.balance),
      ]);
    }
    csvRows.push([r.studentName, "", "TOTAL", "", String(r.totalObligation), String(r.totalPaid), String(r.totalBalance)]);
  }
  const csv = csvRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fee-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

async function downloadStudentPDF(row: StudentRow) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Student Fee Ledger", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Student: ${row.studentName}`, 14, 28);
  doc.text(`Class: ${row.className}${row.sectionName ? ` – ${row.sectionName}` : ""}`, 14, 35);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, 42);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const colX  = [14, 80, 120, 148, 178];
  const colW  = [66, 40, 28,  30,  25];
  let y = 52;

  doc.setFillColor(240, 240, 250);
  doc.rect(14, y - 5, pageWidth - 28, 7, "F");
  doc.text("Fee Type",     colX[0], y);
  doc.text("Frequency",    colX[1], y);
  doc.text("Annual Due",   colX[2], y);
  doc.text("Paid",         colX[3], y);
  doc.text("Balance",      colX[4], y);

  doc.setFont("helvetica", "normal");
  y += 6;
  doc.line(14, y, pageWidth - 14, y);
  y += 4;

  for (const l of row.lines) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(l.feeType.substring(0, 30), colX[0], y);
    doc.text(l.frequency.charAt(0) + l.frequency.slice(1).toLowerCase().replace(/_/g, " "), colX[1], y);
    doc.text(`Rs.${l.obligation.toLocaleString("en-IN")}`, colX[2], y);
    doc.text(`Rs.${l.paid.toLocaleString("en-IN")}`, colX[3], y);
    if (l.balance > 0) doc.setTextColor(200, 0, 0);
    doc.text(`Rs.${l.balance.toLocaleString("en-IN")}`, colX[4], y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  y += 2;
  doc.line(14, y, pageWidth - 14, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", colX[0], y);
  doc.text(`Rs.${row.totalObligation.toLocaleString("en-IN")}`, colX[2], y);
  doc.text(`Rs.${row.totalPaid.toLocaleString("en-IN")}`, colX[3], y);
  if (row.totalBalance > 0) doc.setTextColor(200, 0, 0);
  doc.text(`Rs.${row.totalBalance.toLocaleString("en-IN")}`, colX[4], y);
  doc.setTextColor(0, 0, 0);

  doc.save(`ledger-${row.studentName.replace(/\s+/g, "-")}.pdf`);
  toast.success("PDF downloaded");
}

export function StudentLedgerTable({ rows, classes, filterClassId, search }: Props) {
  const [localSearch, setLocalSearch] = useState(search);
  const [localClass, setLocalClass] = useState(filterClassId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No students found.</p>
      )}

      {filtered.map((row) => {
        const isCollapsed = collapsed.has(row.studentId);
        const pct = row.totalObligation > 0
          ? Math.min(100, Math.round((row.totalPaid / row.totalObligation) * 100))
          : 0;

        return (
          <Card key={row.studentId} className="border-0 shadow-sm">
            <CardContent className="p-0">
              {/* Student header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                <button
                  onClick={() => toggleCollapse(row.studentId)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{row.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {row.className}{row.sectionName ? ` – ${row.sectionName}` : ""}
                    </p>
                  </div>
                </button>

                {/* Progress bar */}
                <div className="hidden sm:flex items-center gap-2 mx-4">
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Annual Due</p>
                    <p className="text-sm font-semibold text-gray-800">₹{row.totalObligation.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Paid</p>
                    <p className="text-sm font-semibold text-green-600">₹{row.totalPaid.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className={`text-sm font-semibold ${row.totalBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                      ₹{row.totalBalance.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadStudentPDF(row)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                    title="Download PDF ledger"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fee lines */}
              {!isCollapsed && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Fee Type</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Frequency</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-400">Annual Due</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-400">Paid</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-400">Balance</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {row.lines.map((l, i) => (
                      <tr key={i} className={`hover:bg-gray-50 ${l.balance > 0 ? "" : "opacity-60"}`}>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{l.feeType}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.frequency.charAt(0) + l.frequency.slice(1).toLowerCase().replace(/_/g, " ")}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">₹{l.obligation.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right text-green-600 font-medium">₹{l.paid.toLocaleString("en-IN")}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${l.balance > 0 ? "text-red-600" : "text-gray-400"}`}>
                          ₹{l.balance.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {l.balance > 0 && (
                            <QuickPayDialog
                              studentId={row.studentId}
                              studentName={row.studentName}
                              feeStructureId={l.feeStructureId}
                              feeType={l.feeType}
                              balance={l.balance}
                              frequency={l.frequency}
                              installments={l.installments}
                              monthlyDueDay={l.monthlyDueDay}
                            />
                          )}
                          {l.balance === 0 && (
                            <span className="text-xs text-green-600 font-medium">✓ Paid</span>
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
