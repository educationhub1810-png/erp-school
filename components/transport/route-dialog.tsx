"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Route {
  id: string;
  routeName: string;
  vehicleNumber: string | null;
  driverName: string | null;
  driverMobile: string | null;
  capacity: number | null;
}

interface Props {
  route?: Route;
}

export function RouteDialog({ route }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = !!route;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const capRaw = fd.get("capacity") as string;
    const body = {
      routeName:    (fd.get("routeName") as string).trim(),
      vehicleNumber: (fd.get("vehicleNumber") as string).trim() || null,
      driverName:   (fd.get("driverName") as string).trim() || null,
      driverMobile: (fd.get("driverMobile") as string).trim() || null,
      capacity:     capRaw ? parseInt(capRaw) : null,
    };

    const url = isEdit ? `/api/v1/transport/routes/${route.id}` : "/api/v1/transport/routes";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
    toast.success(isEdit ? "Route updated" : "Route created");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!route) return;
    if (!confirm(`Delete route "${route.routeName}"? Students assigned to it will be unlinked.`)) return;
    const res = await fetch(`/api/v1/transport/routes/${route.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Cannot delete — remove student assignments first."); return; }
    toast.success("Route deleted");
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
          <Plus className="w-4 h-4 mr-1" /> Add Route
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Route" : "Add Route"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
            <input name="routeName" defaultValue={route?.routeName} required placeholder="e.g. North Route A"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input name="vehicleNumber" defaultValue={route?.vehicleNumber ?? ""} placeholder="MH 04 AB 1234"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats)</label>
              <input name="capacity" type="number" min="1" defaultValue={route?.capacity ?? ""}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input name="driverName" defaultValue={route?.driverName ?? ""}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile</label>
              <input name="driverMobile" defaultValue={route?.driverMobile ?? ""}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
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
