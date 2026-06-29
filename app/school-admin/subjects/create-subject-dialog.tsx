"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nameField, optionalTextField, FIELD_MAX } from "@/lib/field-validation";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: nameField("Subject name"),
  code: optionalTextField("Subject code", 20),
  totalMarks: z.number().int().min(1).max(1000, "Total marks is too large").optional(),
  passMarks: z.number().int().min(0).max(1000, "Pass marks is too large").optional(),
  teacherId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClassOption { id: string; name: string }
interface TeacherOption { id: string; user: { name: string } }

interface Props {
  classes: ClassOption[];
  teachers: TeacherOption[];
}

export function CreateSubjectDialog({ classes, teachers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { totalMarks: 100 },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add subject");
        return;
      }
      toast.success("Subject added successfully");
      reset();
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Add Subject
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Subject Name *</Label>
              <Input placeholder="Mathematics" maxLength={FIELD_MAX.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={watch("classId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("classId", v, { shouldValidate: true }); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class">
                    {(value: string) => classes.find((c) => c.id === value)?.name ?? "Select class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Subject Code</Label>
              <Input placeholder="MATH10" maxLength={20} {...register("code")} />
              {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Total Marks</Label>
              <Input type="number" min={1} max={1000} {...register("totalMarks", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v, 10) })} />
              {errors.totalMarks && <p className="text-xs text-red-500">{errors.totalMarks.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Pass Marks</Label>
              <Input type="number" min={0} max={1000} {...register("passMarks", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v, 10) })} />
              {errors.passMarks && <p className="text-xs text-red-500">{errors.passMarks.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Assign Teacher</Label>
              <Select value={watch("teacherId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("teacherId", v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select teacher">
                    {(value: string) => teachers.find((t) => t.id === value)?.user.name ?? "Select teacher"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.user.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Subject
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
