"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarksEntryDialog } from "./marks-entry-dialog";

interface Props {
  exam: { id: string; name: string };
}

export function ExamRowActions({ exam }: Props) {
  const router = useRouter();
  const [marksOpen, setMarksOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteExam = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/exams/${exam.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: string }).error || "Failed to delete exam");
        return;
      }
      toast.success(`${exam.name} deleted`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button variant="ghost" size="sm" onClick={() => setMarksOpen(true)}>
        <PencilLine className="w-3.5 h-3.5 mr-1.5" /> Enter Marks
      </Button>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors"
          title="Delete exam"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={deleteExam}
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
      )}

      <MarksEntryDialog examId={exam.id} open={marksOpen} onOpenChange={setMarksOpen} />
    </div>
  );
}
