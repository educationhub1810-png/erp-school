"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import {
  MAILBOX_SOURCE_LABELS,
  MAILBOX_SOURCE_BADGE,
  MAILBOX_STATUS_LABELS,
  MAILBOX_STATUS_BADGE,
} from "@/lib/mailbox-config";
import type { MailboxMessageView, MailboxMessageDetail } from "./types";

interface Props {
  message: MailboxMessageView | null;
  onClose: () => void;
  onUpdated: (message: MailboxMessageView) => void;
}

export function MailboxDetailDialog({ message, onClose, onUpdated }: Props) {
  const [detail, setDetail] = useState<MailboxMessageDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const messageId = message?.id;

  // Fetch the full thread and mark the message read, keyed by id so a stale
  // fetch never shows under a different message.
  useEffect(() => {
    if (!messageId) return;
    let cancelled = false;

    fetch(`/api/v1/mailbox/${messageId}`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setDetail(json.data as MailboxMessageDetail); })
      .catch(() => { if (!cancelled) setDetail(null); });

    if (message?.status === "UNREAD") {
      fetch(`/api/v1/mailbox/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          if (json.data) {
            onUpdated({ ...json.data, replyCount: json.data.replies?.length ?? 0 });
          }
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  if (!message) return null;

  const patchStatus = async (status: "READ" | "ARCHIVED" | "UNREAD") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/mailbox/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update message");
        return;
      }
      setDetail(json.data as MailboxMessageDetail);
      onUpdated({ ...json.data, replyCount: json.data.replies?.length ?? 0 });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/mailbox/${message.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to send reply");
        return;
      }
      setDetail(json.data as MailboxMessageDetail);
      onUpdated({ ...json.data, replyCount: json.data.replies?.length ?? 0 });
      setReplyBody("");
      toast.success("Reply sent");
    } finally {
      setBusy(false);
    }
  };

  const receivedOn = new Date(message.createdAt).toLocaleString();
  const isArchived = (detail?.status ?? message.status) === "ARCHIVED";
  const replies = detail?.replies ?? [];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{message.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${MAILBOX_SOURCE_BADGE[message.source]} hover:${MAILBOX_SOURCE_BADGE[message.source]}`}>
              {MAILBOX_SOURCE_LABELS[message.source]}
            </Badge>
            <Badge className={`${MAILBOX_STATUS_BADGE[detail?.status ?? message.status]} hover:${MAILBOX_STATUS_BADGE[detail?.status ?? message.status]}`}>
              {MAILBOX_STATUS_LABELS[detail?.status ?? message.status]}
            </Badge>
          </div>

          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{message.email}</span>
            {message.phone && <> · {message.phone}</>}
            {message.schoolName && <> · {message.schoolName}</>}
            {" "}· {receivedOn}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-500">Message</Label>
            <p className="text-gray-800 whitespace-pre-wrap">
              {message.message || <span className="italic text-gray-400">No message</span>}
            </p>
          </div>

          {replies.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-gray-500">Replies</Label>
              {replies.map((r) => (
                <div key={r.id} className="rounded-md bg-indigo-50/60 p-3">
                  <p className="text-gray-800 whitespace-pre-wrap">{r.body}</p>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {r.sentBy.name} · {new Date(r.sentAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="mailbox-reply-body" className="text-gray-500">Reply</Label>
            <Textarea
              id="mailbox-reply-body"
              rows={3}
              placeholder={`Write a reply to ${message.name}…`}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              disabled={busy}
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={sendReply} disabled={busy || !replyBody.trim()}>
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Send Reply
              </Button>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => patchStatus(isArchived ? "READ" : "ARCHIVED")}
              disabled={busy}
            >
              {isArchived ? (
                <><ArchiveRestore className="w-4 h-4 mr-1.5" />Unarchive</>
              ) : (
                <><Archive className="w-4 h-4 mr-1.5" />Archive</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
