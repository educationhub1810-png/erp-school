"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  homework: { id: string; title: string };
}

export function HomeworkRowActions({ homework }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteHomework = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/homework/${homework.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: string }).error || "Failed to delete homework");
        return;
      }
      toast.success(`${homework.title} deleted`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!confirmDelete) {
    return (
      <button
        onClick={() => setConfirmDelete(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors"
        title="Delete homework"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={deleteHomework}
        disabled={deleting}
        className="text-xs font-medium px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete?"}
      </button>
      <button
        onClick={() => setConfirmDelete(false)}
        className="text-xs px-1.5 py-1 rounded text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
