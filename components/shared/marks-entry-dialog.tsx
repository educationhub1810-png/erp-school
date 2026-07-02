"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Schedule { id: string; subjectId: string; subject: { name: string }; totalMarks: number; passMarks: number }
interface ClassSubject { id: string; name: string; totalMarks: number; passMarks: number | null }
interface StudentResult {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string;
}

interface Props {
  examId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarksEntryDialog({ examId, open, onOpenChange }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setSelectedSubjectId(""); setScheduleId(""); setStudents([]); return; }
    fetch(`/api/v1/exams/${examId}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? {};
        setSchedules(data.schedules ?? []);
        setClassSubjects(data.class?.subjects ?? []);
      });
  }, [open, examId]);

  const handleSubjectSelect = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setStudents([]);

    // Find existing schedule for this subject
    const existing = schedules.find((s) => s.subjectId === subjectId);
    if (existing) {
      setScheduleId(existing.id);
      return;
    }

    // No schedule yet — create one automatically
    setCreatingSchedule(true);
    try {
      const res = await fetch(`/api/v1/exams/${examId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to create subject schedule");
        setSelectedSubjectId("");
        return;
      }
      const newSchedule: Schedule = json.data;
      setSchedules((prev) => [...prev, newSchedule]);
      setScheduleId(newSchedule.id);
    } finally {
      setCreatingSchedule(false);
    }
  };

  useEffect(() => {
    if (!scheduleId) { setStudents([]); return; }
    setLoading(true);
    fetch(`/api/v1/exams/${examId}/results?scheduleId=${scheduleId}`)
      .then((res) => res.json())
      .then((json) => setStudents(json.data ?? []))
      .finally(() => setLoading(false));
  }, [scheduleId, examId]);

  const selectedSchedule = schedules.find((s) => s.id === scheduleId);

  const updateRow = (id: string, patch: Partial<StudentResult>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    if (!scheduleId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/exams/${examId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          results: students.map((s) => ({
            studentId: s.id,
            marksObtained: s.marksObtained ?? undefined,
            isAbsent: s.isAbsent,
            remarks: s.remarks || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save marks");
        return;
      }
      toast.success(`Marks saved for ${json.data.saved} students`);
    } finally {
      setSaving(false);
    }
  };

  // Merge: all class subjects, preferring ones that already have a schedule
  const subjectOptions = classSubjects.map((cs) => ({
    subjectId: cs.id,
    name: cs.name,
    hasSchedule: schedules.some((s) => s.subjectId === cs.id),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Enter Marks</DialogTitle></DialogHeader>

        <div className="space-y-1.5">
          <Label>Subject *</Label>
          <Select
            value={selectedSubjectId}
            onValueChange={(v) => { if (v) handleSubjectSelect(v); }}
            disabled={creatingSchedule}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subject">
                {(value: string) => subjectOptions.find((s) => s.subjectId === value)?.name ?? "Select subject"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">No subjects found for this class</div>
              ) : (
                subjectOptions.map((s) => (
                  <SelectItem key={s.subjectId} value={s.subjectId}>{s.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {creatingSchedule && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Setting up subject schedule…
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : students.length > 0 && selectedSchedule ? (
          <div className="border rounded-lg divide-y mt-2">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-400">Roll: {s.rollNumber ?? "—"}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={selectedSchedule.totalMarks}
                  className="w-20"
                  disabled={s.isAbsent}
                  value={s.marksObtained ?? ""}
                  onChange={(e) => updateRow(s.id, { marksObtained: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 shrink-0">
                  <input
                    type="checkbox"
                    checked={s.isAbsent}
                    onChange={(e) => updateRow(s.id, { isAbsent: e.target.checked, marksObtained: e.target.checked ? null : s.marksObtained })}
                  />
                  Absent
                </label>
              </div>
            ))}
          </div>
        ) : scheduleId && !loading ? (
          <p className="text-sm text-gray-400 text-center py-8">No students found for this class.</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" onClick={handleSave} disabled={!scheduleId || saving || creatingSchedule} className="bg-indigo-600 hover:bg-indigo-700">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Marks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
