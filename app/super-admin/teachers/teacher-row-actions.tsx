"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditTeacherDialog, type EditableTeacher } from "./edit-teacher-dialog";

interface Props {
  teacher: EditableTeacher;
}

export function TeacherRowActions({ teacher }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleActive = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/v1/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !teacher.user.isActive }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      toast.success(`${teacher.user.name} ${teacher.user.isActive ? "deactivated" : "activated"}`);
      router.refresh();
    } finally {
      setToggling(false);
    }
  };

  const deleteTeacher = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/teachers/${teacher.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: string }).error || "Failed to delete teacher");
        return;
      }
      toast.success(`${teacher.user.name} deleted`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={toggleActive}
        disabled={toggling}
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
          teacher.user.isActive
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-green-200 text-green-600 hover:bg-green-50"
        }`}
      >
        {toggling && <Loader2 className="w-3 h-3 animate-spin" />}
        {teacher.user.isActive ? "Disable" : "Enable"}
      </button>

      <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} title="Edit teacher">
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors"
          title="Delete teacher"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={deleteTeacher}
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

      <EditTeacherDialog teacher={teacher} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
