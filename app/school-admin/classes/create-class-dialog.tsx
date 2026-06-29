"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { nameField, positiveIntField, FIELD_MAX } from "@/lib/field-validation";

const schema = z.object({
  name: nameField("Class name"),
  capacity: positiveIntField("Capacity", { required: false, max: 500 }),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.infer<typeof schema>;

export function CreateClassDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, capacity: data.capacity ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Request failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`Class "${data.name}" added`);
      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Add Class
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Class Name *</Label>
            <Input placeholder="Nursery, Jr. KG, Class 1..." maxLength={FIELD_MAX.name} {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input type="number" placeholder="40" {...register("capacity")} />
            {errors.capacity && <p className="text-xs text-red-500">{errors.capacity.message}</p>}
          </div>
          <p className="text-xs text-gray-500">Sections A–G are added automatically.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Class
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
