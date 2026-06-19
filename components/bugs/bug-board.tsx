"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import {
  BUG_STATUSES,
  BUG_STATUS_LABELS,
  BUG_STATUS_ACCENT,
  BUG_PRIORITY_LABELS,
  BUG_PRIORITY_BADGE,
  type BugStatus,
} from "@/lib/bug-config";
import { CreateBugDialog } from "./create-bug-dialog";
import { BugDetailDialog } from "./bug-detail-dialog";
import type { BugTicketView } from "./types";

interface Props {
  initialTickets: BugTicketView[];
  role: AppRole;
  currentUserId: string;
}

export function BugBoard({ initialTickets, role, currentUserId }: Props) {
  const canMove = role === "SUPER_ADMIN";
  const [tickets, setTickets] = useState<BugTicketView[]>(initialTickets);
  const [selected, setSelected] = useState<BugTicketView | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<BugStatus | null>(null);

  const upsert = (ticket: BugTicketView) =>
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      return exists ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [ticket, ...prev];
    });

  const moveTicket = async (id: string, status: BugStatus) => {
    const current = tickets.find((t) => t.id === id);
    if (!current || current.status === status) return;

    // Optimistic update, revert on failure.
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const res = await fetch(`/api/v1/bugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Failed to move ticket");
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: current.status } : t)));
      }
    } catch {
      toast.error("Failed to move ticket");
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: current.status } : t)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bug Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canMove
              ? "Triage and move bug tickets across the board"
              : "Report bugs and track their status"}
          </p>
        </div>
        <CreateBugDialog onCreated={upsert} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BUG_STATUSES.map((status) => {
          const columnTickets = tickets.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={canMove ? (e) => { e.preventDefault(); setDragOver(status); } : undefined}
              onDragLeave={canMove ? () => setDragOver((s) => (s === status ? null : s)) : undefined}
              onDrop={canMove ? (e) => {
                e.preventDefault();
                setDragOver(null);
                if (draggedId) moveTicket(draggedId, status);
                setDraggedId(null);
              } : undefined}
              className={`rounded-lg border bg-gray-50/60 p-3 transition-colors ${
                dragOver === status ? "border-indigo-400 bg-indigo-50/60" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${BUG_STATUS_ACCENT[status]}`} />
                  <span className="text-sm font-semibold text-gray-700">{BUG_STATUS_LABELS[status]}</span>
                </div>
                <span className="text-xs text-gray-400">{columnTickets.length}</span>
              </div>

              <div className="space-y-2 min-h-12">
                {columnTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    draggable={canMove}
                    onDragStart={canMove ? () => setDraggedId(t.id) : undefined}
                    onDragEnd={canMove ? () => { setDraggedId(null); setDragOver(null); } : undefined}
                    onClick={() => setSelected(t)}
                    className={`w-full rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow ${
                      canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${draggedId === t.id ? "opacity-50" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{t.title}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge className={`${BUG_PRIORITY_BADGE[t.priority]} hover:${BUG_PRIORITY_BADGE[t.priority]} text-[10px] px-1.5 py-0`}>
                        {BUG_PRIORITY_LABELS[t.priority]}
                      </Badge>
                      {t.screenshotUrl && <ImageIcon className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {t.reporter.name} · {ROLE_LABELS[t.reporter.role as AppRole] ?? t.reporter.role}
                      {t.school && <> · {t.school.code}</>}
                    </p>
                  </button>
                ))}
                {columnTickets.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-gray-300">No tickets</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BugDetailDialog
        ticket={selected}
        canMove={canMove}
        currentUserId={currentUserId}
        onClose={() => setSelected(null)}
        onUpdated={(t) => { upsert(t); setSelected(t); }}
        onDeleted={(id) => { setTickets((prev) => prev.filter((x) => x.id !== id)); setSelected(null); }}
      />
    </div>
  );
}
