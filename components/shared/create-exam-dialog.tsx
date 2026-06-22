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
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EXAM_TYPES: { value: string; label: string }[] = [
  { value: "UNIT_TEST", label: "Unit Test" },
  { value: "MID_TERM", label: "Mid Term" },
  { value: "FINAL", label: "Final" },
  { value: "PRACTICAL", label: "Practical" },
  { value: "INTERNAL", label: "Internal" },
  { value: "EXTERNAL", label: "External" },
];

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Exam name is required"),
  examType: z.enum(["UNIT_TEST", "MID_TERM", "FINAL", "PRACTICAL", "INTERNAL", "EXTERNAL"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClassOption { id: string; name: string }

interface Props {
  classes: ClassOption[];
}

export function CreateExamDialog({ classes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { examType: "UNIT_TEST" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to create exam");
        return;
      }
      toast.success("Exam created — schedules generated from the class subjects");
      reset({ examType: "UNIT_TEST" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ examType: "UNIT_TEST" }); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Add Exam
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add New Exam</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Exam Name *</Label>
            <Input placeholder="Unit Test 1" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label>Exam Type *</Label>
              <Select value={watch("examType")} onValueChange={(v) => { if (v == null) return; setValue("examType", v as FormValues["examType"]); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => EXAM_TYPES.find((t) => t.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <DatePicker value={watch("startDate")} onChange={(v) => setValue("startDate", v)} placeholder="Select date" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <DatePicker value={watch("endDate")} onChange={(v) => setValue("endDate", v)} placeholder="Select date" />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">A schedule will be created automatically for each subject in the selected class.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Exam
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
