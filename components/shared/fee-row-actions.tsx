"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EditFeeStructureDialog, type EditableFeeStructure } from "./edit-fee-structure-dialog";
import { EditFeePaymentDialog, type EditablePayment } from "./edit-fee-payment-dialog";

// ── Fee Structure row actions ───────────────────────────

export function FeeStructureRowActions({ structure }: { structure: EditableFeeStructure }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/fees/structures/${structure.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to delete"); return; }
      toast.success("Fee structure deleted");
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <EditFeeStructureDialog structure={structure} />
      <Button
        type="button" variant="ghost" size="icon-sm"
        className={`h-7 w-7 ${confirm ? "text-red-600 hover:text-red-700" : "text-gray-400 hover:text-red-500"}`}
        onClick={handleDelete}
        disabled={deleting}
        title={confirm ? "Click again to confirm delete" : "Delete"}
        onBlur={() => setConfirm(false)}
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

// ── Fee Payment row actions ─────────────────────────────

export function FeePaymentRowActions({ payment }: { payment: EditablePayment }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/fees/payments/${payment.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to delete"); return; }
      toast.success("Payment deleted");
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <EditFeePaymentDialog payment={payment} />
      <Button
        type="button" variant="ghost" size="icon-sm"
        className={`h-7 w-7 ${confirm ? "text-red-600 hover:text-red-700" : "text-gray-400 hover:text-red-500"}`}
        onClick={handleDelete}
        disabled={deleting}
        title={confirm ? "Click again to confirm delete" : "Delete"}
        onBlur={() => setConfirm(false)}
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}
