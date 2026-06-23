"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }
interface StudentRow {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  rollNumber: string | null;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "HOLIDAY";
  remarks: string;
}

const STATUS_OPTIONS: { value: StudentRow["status"]; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "HOLIDAY", label: "Holiday" },
];

const STATUS_COLOR: Record<StudentRow["status"], string> = {
  PRESENT: "text-green-700 bg-green-50 border-green-200",
  ABSENT: "text-red-700 bg-red-50 border-red-200",
  LATE: "text-orange-700 bg-orange-50 border-orange-200",
  HALF_DAY: "text-yellow-700 bg-yellow-50 border-yellow-200",
  HOLIDAY: "text-gray-700 bg-gray-50 border-gray-200",
};

interface Props {
  classes: ClassOption[];
}

export function AttendanceMarker({ classes }: Props) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (!classId || !date) { setStudents([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ classId, date, ...(sectionId && { sectionId }) });
    fetch(`/api/v1/attendance?${params}`)
      .then((res) => res.json())
      .then((json) => setStudents(json.data ?? []))
      .finally(() => setLoading(false));
  }, [classId, sectionId, date]);

  const updateStatus = (studentId: string, status: StudentRow["status"]) => {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, status } : s)));
  };

  const markAll = (status: StudentRow["status"]) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!classId || !date || students.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sectionId: sectionId || undefined,
          date,
          records: students.map((s) => ({ studentId: s.id, status: s.status, remarks: s.remarks || undefined })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save attendance");
        return;
      }
      toast.success(`Attendance saved for ${json.data.marked} students`);
    } finally {
      setSaving(false);
    }
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

          <div className="space-y-1.5">
            <Label>Date *</Label>
            <DatePicker value={date} onChange={setDate} placeholder="Select date" />
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
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No students found</p>
                <p className="text-sm text-gray-400 mt-1">Choose a class with enrolled students</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">{students.length} students</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => markAll("PRESENT")}>Mark all Present</Button>
                    <Button variant="outline" size="sm" onClick={() => markAll("ABSENT")}>Mark all Absent</Button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Roll No.</th>
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Name</th>
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-2.5 text-gray-500">{s.rollNumber ?? "—"}</td>
                        <td className="px-6 py-2.5 font-medium text-gray-900">{s.firstName} {s.middleName} {s.lastName}</td>
                        <td className="px-6 py-2.5">
                          <div className="flex gap-1.5">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => updateStatus(s.id, opt.value)}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                                  s.status === opt.value ? STATUS_COLOR[opt.value] : "border-transparent text-gray-400 hover:bg-gray-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end px-6 py-4 border-t">
                  <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Attendance
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
