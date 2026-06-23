"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditStudentDialog, type EditableStudent } from "./edit-student-dialog";

interface Class { id: string; name: string; sections: { id: string; name: string }[] }

interface Props {
  student: EditableStudent;
  classes: Class[];
}

export function StudentRowActions({ student, classes }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteStudent = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: string }).error || "Failed to delete student");
        return;
      }
      toast.success(`${student.firstName} ${student.lastName} deleted`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} title="Edit student">
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors"
          title="Delete student"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={deleteStudent}
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

      <EditStudentDialog student={student} classes={classes} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
