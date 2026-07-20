"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen } from "lucide-react";
import {
  MAILBOX_SOURCE_LABELS,
  MAILBOX_SOURCE_BADGE,
  MAILBOX_STATUS_LABELS,
  MAILBOX_STATUS_BADGE,
} from "@/lib/mailbox-config";
import { MailboxDetailDialog } from "./mailbox-detail-dialog";
import type { MailboxMessageView } from "./types";

interface Props {
  initialMessages: MailboxMessageView[];
}

const FILTERS = ["ALL", "UNREAD", "ARCHIVED"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "All",
  UNREAD: "Unread",
  ARCHIVED: "Archived",
};

export function MailboxInbox({ initialMessages }: Props) {
  const [messages, setMessages] = useState<MailboxMessageView[]>(initialMessages);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const upsert = (message: MailboxMessageView) =>
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      return exists ? prev.map((m) => (m.id === message.id ? message : m)) : [message, ...prev];
    });

  const visible = useMemo(() => {
    if (filter === "UNREAD") return messages.filter((m) => m.status === "UNREAD");
    if (filter === "ARCHIVED") return messages.filter((m) => m.status === "ARCHIVED");
    return messages.filter((m) => m.status !== "ARCHIVED");
  }, [messages, filter]);

  const unreadCount = messages.filter((m) => m.status === "UNREAD").length;
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mailbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          Demo requests and contact messages submitted from the public site
        </p>
      </div>

      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {FILTER_LABELS[f]}
            {f === "UNREAD" && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
        {visible.map((m) => {
          const isUnread = m.status === "UNREAD";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              {isUnread ? (
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              ) : (
                <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                    {m.name}
                  </span>
                  <span className="text-xs text-gray-400">{m.email}</span>
                  <Badge className={`${MAILBOX_SOURCE_BADGE[m.source]} hover:${MAILBOX_SOURCE_BADGE[m.source]} text-[10px] px-1.5 py-0`}>
                    {MAILBOX_SOURCE_LABELS[m.source]}
                  </Badge>
                  <Badge className={`${MAILBOX_STATUS_BADGE[m.status]} hover:${MAILBOX_STATUS_BADGE[m.status]} text-[10px] px-1.5 py-0`}>
                    {MAILBOX_STATUS_LABELS[m.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                  {m.message || <span className="italic text-gray-300">No message</span>}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">
                {new Date(m.createdAt).toLocaleDateString("en-US")}
              </span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">No messages</p>
        )}
      </div>

      <MailboxDetailDialog
        message={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={upsert}
      />
    </div>
  );
}
