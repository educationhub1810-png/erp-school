"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }
interface SubjectOption { id: string; name: string; classId: string }
interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { name: string };
  teacher: { user: { name: string } } | null;
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  subjectId: z.string().min(1, "Subject is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});
type SlotFormValues = z.infer<typeof slotSchema>;

interface Props {
  classes: ClassOption[];
  subjects: SubjectOption[];
}

export function TimetableGrid({ classes, subjects }: Props) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const classSubjects = subjects.filter((s) => s.classId === classId);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: { dayOfWeek: 1 },
  });

  const loadSlots = () => {
    if (!classId) { setSlots([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ classId, ...(sectionId && { sectionId }) });
    fetch(`/api/v1/timetable?${params}`)
      .then((res) => res.json())
      .then((json) => setSlots(json.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(loadSlots, [classId, sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAddSlot = async (data: SlotFormValues) => {
    const res = await fetch("/api/v1/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, classId, sectionId: sectionId || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Failed to add period");
      return;
    }
    toast.success("Period added to timetable");
    reset({ dayOfWeek: 1 });
    setAddOpen(false);
    loadSlots();
  };

  const deleteSlot = async (id: string) => {
    const res = await fetch(`/api/v1/timetable/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to remove period"); return; }
    toast.success("Period removed");
    loadSlots();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Class *</Label>
            <Select value={classId} onValueChange={(v) => { if (v == null) return; setClassId(v); setSectionId(""); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select class">
                  {(value: string) => classes.find((c) => c.id === value)?.name ?? "Select class"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={(v) => { if (v == null) return; setSectionId(v); }} disabled={!selectedClass?.sections.length}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All sections">
                  {(value: string) => {
                    const section = selectedClass?.sections.find((s) => s.id === value);
                    return section ? `Section ${section.name}` : "All sections";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) reset({ dayOfWeek: 1 }); }}>
              <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 w-full" disabled={!classId} />}>
                <Plus className="w-4 h-4 mr-2" /> Add Period
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Period</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onAddSlot)} className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label>Day *</Label>
                    <Select value={String(watch("dayOfWeek"))} onValueChange={(v) => { if (v == null) return; setValue("dayOfWeek", parseInt(v, 10)); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value: string) => DAY_LABELS[parseInt(value, 10)]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_ORDER.map((d) => <SelectItem key={d} value={String(d)}>{DAY_LABELS[d]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject *</Label>
                    <Select value={watch("subjectId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("subjectId", v, { shouldValidate: true }); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subject">
                          {(value: string) => classSubjects.find((s) => s.id === value)?.name ?? "Select subject"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {classSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.subjectId && <p className="text-xs text-red-500">{errors.subjectId.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Start Time *</Label>
                      <Input type="time" {...register("startTime")} />
                      {errors.startTime && <p className="text-xs text-red-500">{errors.startTime.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time *</Label>
                      <Input type="time" {...register("endTime")} />
                      {errors.endTime && <p className="text-xs text-red-500">{errors.endTime.message}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Period
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {classId && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarCheck className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No periods scheduled</p>
                <p className="text-sm text-gray-400 mt-1">Add a period to build the timetable</p>
              </div>
            ) : (
              <div className="divide-y">
                {DAY_ORDER.filter((d) => slots.some((s) => s.dayOfWeek === d)).map((day) => (
                  <div key={day} className="px-6 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{DAY_LABELS[day]}</p>
                    <div className="space-y-1.5">
                      {slots.filter((s) => s.dayOfWeek === day).map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border bg-gray-50/60 px-3 py-2">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-mono text-xs text-gray-500 w-24">{s.startTime}–{s.endTime}</span>
                            <span className="font-medium text-gray-900">{s.subject.name}</span>
                            {s.teacher && <span className="text-xs text-gray-400">{s.teacher.user.name}</span>}
                          </div>
                          <button onClick={() => deleteSlot(s.id)} className="text-gray-400 hover:text-red-500" title="Remove period">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
