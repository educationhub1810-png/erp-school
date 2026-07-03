"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Slab {
  id: string;
  label: string;
  fromKm: number;
  toKm: number | null;
  amount: number;
}

interface Props {
  slab?: Slab;
}

export function SlabDialog({ slab }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = !!slab;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const toKmRaw = fd.get("toKm") as string;
    const body = {
      label:  (fd.get("label") as string).trim(),
      fromKm: parseFloat(fd.get("fromKm") as string),
      toKm:   toKmRaw ? parseFloat(toKmRaw) : null,
      amount: parseFloat(fd.get("amount") as string),
    };

    const url = isEdit ? `/api/v1/transport/slabs/${slab.id}` : "/api/v1/transport/slabs";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
    toast.success(isEdit ? "Slab updated" : "Slab created");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!slab) return;
    if (!confirm(`Delete "${slab.label}"?`)) return;
    const res = await fetch(`/api/v1/transport/slabs/${slab.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Slab deleted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger render={<button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" />}>
          <Pencil className="w-3.5 h-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" />}>
          <Plus className="w-4 h-4 mr-1" /> Add Slab
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Distance Slab" : "Add Distance Slab"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input name="label" defaultValue={slab?.label} required placeholder="e.g. Up to 3 km"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From (km)</label>
              <input name="fromKm" type="number" step="0.1" min="0" defaultValue={slab?.fromKm ?? 0} required
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To (km) <span className="text-gray-400 font-normal text-xs">— blank = &amp; above</span>
              </label>
              <input name="toKm" type="number" step="0.1" min="0" defaultValue={slab?.toKm ?? ""}
                placeholder="No limit"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee (₹)</label>
            <input name="amount" type="number" step="0.01" min="1" defaultValue={slab?.amount} required
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-2 pt-1">
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            <div className="flex-1" />
            <DialogClose render={<button type="button" className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50" />}>
              Cancel
            </DialogClose>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
