"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  totalMarks: z.number().int().min(1).optional(),
  passMarks: z.number().int().min(0).optional(),
  teacherId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClassOption { id: string; name: string }
interface TeacherOption { id: string; user: { name: string } }

export interface EditableSubject {
  id: string;
  classId: string;
  name: string;
  code: string | null;
  totalMarks: number;
  passMarks: number | null;
  teacherId: string | null;
}

interface Props {
  subject: EditableSubject;
  classes: ClassOption[];
  teachers: TeacherOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubjectDialog({ subject, classes, teachers, open, onOpenChange }: Props) {
  const router = useRouter();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        classId: subject.classId,
        name: subject.name,
        code: subject.code ?? "",
        totalMarks: subject.totalMarks,
        passMarks: subject.passMarks ?? undefined,
        teacherId: subject.teacherId ?? undefined,
      });
    }
  }, [open, subject, reset]);

  const onSubmit = async (data: FormValues) => {
    const res = await fetch(`/api/v1/subjects/${subject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, teacherId: data.teacherId || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Failed to update subject");
      return;
    }
    toast.success("Subject updated successfully");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Subject Name *</Label>
              <Input {...register("name")} />
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
              <Input {...register("code")} />
            </div>

            <div className="space-y-1.5">
              <Label>Total Marks</Label>
              <Input type="number" min={1} {...register("totalMarks", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v, 10) })} />
            </div>

            <div className="space-y-1.5">
              <Label>Pass Marks</Label>
              <Input type="number" min={0} {...register("passMarks", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v, 10) })} />
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
