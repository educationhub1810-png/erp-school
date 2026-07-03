"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Route   { id: string; routeName: string; }
interface Slab    { id: string; label: string; amount: number; fromKm: number; toKm: number | null; }
interface Student { id: string; name: string; className: string; }

interface Assignment {
  id: string;
  studentId: string;
  routeId: string;
  slabId: string | null;
  stopName: string | null;
  distanceKm: number | null;
}

interface Props {
  routes:     Route[];
  slabs:      Slab[];
  students:   Student[];
  assignment?: Assignment;
}

export function AssignStudentDialog({ routes, slabs, students, assignment }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSlabId, setSelectedSlabId] = useState(assignment?.slabId ?? "");

  const isEdit = !!assignment;
  const selectedSlab = slabs.find((s) => s.id === selectedSlabId);

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) setSelectedSlabId(assignment?.slabId ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const distRaw = fd.get("distanceKm") as string;
    const body = {
      studentId:  fd.get("studentId") as string,
      routeId:    fd.get("routeId") as string,
      slabId:     selectedSlabId || null,
      stopName:   (fd.get("stopName") as string).trim() || null,
      distanceKm: distRaw ? parseFloat(distRaw) : null,
    };

    const url = isEdit ? `/api/v1/transport/students/${assignment.id}` : "/api/v1/transport/students";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
    toast.success(isEdit ? "Assignment updated" : "Student assigned");
    setOpen(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!assignment) return;
    if (!confirm("Remove this student from transport?")) return;
    const res = await fetch(`/api/v1/transport/students/${assignment.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to remove"); return; }
    toast.success("Student removed from transport");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEdit ? (
        <DialogTrigger render={<button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" />}>
          <Pencil className="w-3.5 h-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" />}>
          <Plus className="w-4 h-4 mr-1" /> Assign Student
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transport Assignment" : "Assign Student to Transport"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <select name="studentId" required defaultValue=""
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
            <select name="routeId" required defaultValue={assignment?.routeId ?? ""}
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>Select route…</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.routeName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance Slab</label>
            <select value={selectedSlabId} onChange={(e) => setSelectedSlabId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">No slab</option>
              {slabs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — ₹{s.amount.toLocaleString("en-IN")}/mo
                </option>
              ))}
            </select>
            {selectedSlab && (
              <p className="mt-1.5 text-xs text-indigo-600 font-medium">
                Monthly fee: ₹{selectedSlab.amount.toLocaleString("en-IN")}
                {" · "}{selectedSlab.fromKm} km – {selectedSlab.toKm != null ? `${selectedSlab.toKm} km` : "above"}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stop Name</label>
              <input name="stopName" defaultValue={assignment?.stopName ?? ""} placeholder="e.g. Sector 12"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
              <input name="distanceKm" type="number" step="0.1" min="0"
                defaultValue={assignment?.distanceKm ?? ""}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {isEdit && (
              <button type="button" onClick={handleRemove}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <div className="flex-1" />
            <DialogClose render={<button type="button" className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50" />}>
              Cancel
            </DialogClose>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Saving…" : isEdit ? "Update" : "Assign"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
