"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  userId: string;
  name: string;
  /** Hide the control entirely — e.g. for the acting admin's own row. */
  disabled?: boolean;
}

// Inline "Delete? / Cancel" confirm, matching the row-action pattern used across
// the admin tables. Calls DELETE /api/v1/users/:id and refreshes on success.
export function DeleteUserAction({ userId, name, disabled }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (disabled) {
    return <span className="text-xs text-gray-300" title="You can't delete your own account">—</span>;
  }

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: string }).error || "Failed to delete user");
        return;
      }
      toast.success(`${name} deleted`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return !confirm ? (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors"
      title="Delete user"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  ) : (
    <div className="flex items-center gap-1">
      <button
        onClick={remove}
        disabled={deleting}
        className="text-xs font-medium px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete?"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs px-1.5 py-1 rounded text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
