"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import {
  BUG_STATUSES,
  BUG_STATUS_LABELS,
  BUG_PRIORITIES,
  BUG_PRIORITY_LABELS,
  BUG_PRIORITY_BADGE,
} from "@/lib/bug-config";
import type { BugTicketView } from "./types";

interface Props {
  ticket: BugTicketView | null;
  canMove: boolean;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (ticket: BugTicketView) => void;
  onDeleted: (id: string) => void;
}

export function BugDetailDialog({ ticket, canMove, currentUserId, onClose, onUpdated, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  // Keyed by ticket id so a stale fetch never shows under a different ticket.
  const [screenshot, setScreenshot] = useState<{ id: string; url: string | null } | null>(null);

  const ticketId = ticket?.id;
  const hasScreenshot = ticket?.hasScreenshot ?? false;

  // Fetch the (heavy) screenshot only when a ticket with one is opened.
  // setState is only ever called from async callbacks (no synchronous effect setState).
  useEffect(() => {
    if (!ticketId || !hasScreenshot) return;
    let cancelled = false;
    fetch(`/api/v1/bugs/${ticketId}`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setScreenshot({ id: ticketId, url: json.data?.screenshotUrl ?? null }); })
      .catch(() => { if (!cancelled) setScreenshot({ id: ticketId, url: null }); });
    return () => { cancelled = true; };
  }, [ticketId, hasScreenshot]);

  if (!ticket) return null;

  const screenshotReady = screenshot?.id === ticket.id;
  const screenshotUrl = screenshotReady ? screenshot?.url ?? null : null;
  const screenshotLoading = ticket.hasScreenshot && !screenshotReady;

  const canDelete = canMove || ticket.reporterId === currentUserId;

  const patch = async (body: Partial<Pick<BugTicketView, "status" | "priority">>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/bugs/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update ticket");
        return;
      }
      onUpdated(json.data as BugTicketView);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/bugs/${ticket.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to delete ticket");
        return;
      }
      toast.success("Ticket deleted");
      onDeleted(ticket.id);
    } finally {
      setBusy(false);
    }
  };

  const reportedOn = new Date(ticket.createdAt).toLocaleString();

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{ticket.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${BUG_PRIORITY_BADGE[ticket.priority]} hover:${BUG_PRIORITY_BADGE[ticket.priority]}`}>
              {BUG_PRIORITY_LABELS[ticket.priority]} priority
            </Badge>
            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
              {BUG_STATUS_LABELS[ticket.status]}
            </Badge>
          </div>

          <div className="text-xs text-gray-500">
            Reported by <span className="font-medium text-gray-700">{ticket.reporter.name}</span>
            {" "}({ROLE_LABELS[ticket.reporter.role as AppRole] ?? ticket.reporter.role})
            {ticket.school && <> · {ticket.school.name} ({ticket.school.code})</>}
            {" "}· {reportedOn}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-500">Description</Label>
            <p className="text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-500">What is not working</Label>
            <p className="text-gray-800 whitespace-pre-wrap">{ticket.whatNotWorking}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-500">What is expected</Label>
            <p className="text-gray-800 whitespace-pre-wrap">{ticket.whatExpected}</p>
          </div>

          {ticket.hasScreenshot && (
            <div className="space-y-1">
              <Label className="text-gray-500">Screenshot</Label>
              {screenshotLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading screenshot…
                </div>
              ) : screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={screenshotUrl} alt="Screenshot" className="max-h-80 w-auto rounded-md border bg-gray-50" />
              ) : (
                <p className="text-xs text-gray-400">Screenshot unavailable.</p>
              )}
            </div>
          )}

          {canMove && (
            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label className="text-gray-500">Status</Label>
                <Select value={ticket.status} onValueChange={(v) => patch({ status: v as BugTicketView["status"] })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUG_STATUSES.map((s) => <SelectItem key={s} value={s}>{BUG_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500">Priority</Label>
                <Select value={ticket.priority} onValueChange={(v) => patch({ priority: v as BugTicketView["priority"] })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUG_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{BUG_PRIORITY_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {canDelete && (
            <div className="flex justify-end border-t pt-4">
              <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={remove} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
