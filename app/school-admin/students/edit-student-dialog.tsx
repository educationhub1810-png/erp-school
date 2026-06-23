"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  rollNumber: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  house: z.string().optional(),
  previousSchool: z.string().optional(),
  transportRequired: z.boolean(),
  hostelRequired: z.boolean(),
  medicalNotes: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Other"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const HOUSES = ["Red", "Blue", "Green", "Yellow", "House A", "House B", "House C", "House D"];

interface Class { id: string; name: string; sections: { id: string; name: string }[] }

export interface EditableStudent {
  id: string;
  studentCode: string;
  rollNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dob: Date | string | null;
  bloodGroup: string | null;
  category: string | null;
  religion: string | null;
  classId: string;
  sectionId: string | null;
  house: string | null;
  previousSchool: string | null;
  transportRequired: boolean;
  hostelRequired: boolean;
  medicalNotes: string | null;
  user: { email: string | null; mobile: string | null };
}

interface Props {
  student: EditableStudent;
  classes: Class[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStudentDialog({ student, classes, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedClassId = watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    if (!open) return;
    reset({
      firstName: student.firstName,
      middleName: student.middleName || "",
      lastName: student.lastName,
      gender: student.gender,
      dob: student.dob ? new Date(student.dob).toISOString().split("T")[0] : "",
      bloodGroup: student.bloodGroup || "",
      category: student.category || "",
      religion: student.religion || "",
      rollNumber: student.rollNumber || "",
      classId: student.classId,
      sectionId: student.sectionId || "",
      house: student.house || "",
      previousSchool: student.previousSchool || "",
      transportRequired: student.transportRequired,
      hostelRequired: student.hostelRequired,
      medicalNotes: student.medicalNotes || "",
      email: student.user.email || "",
      mobile: student.user.mobile || "",
    });
  }, [open, student, reset]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update student");
        return;
      }
      toast.success("Student updated");
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v, eventDetails) => {
        if (!v && eventDetails.reason !== "close-press") return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">Student Code: {student.studentCode}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Middle Name</Label>
              <Input {...register("middleName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select value={watch("gender") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("gender", v as "MALE" | "FEMALE" | "OTHER"); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth *</Label>
              <Input type="date" {...register("dob")} />
              {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Select value={watch("bloodGroup") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("bloodGroup", v); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch("category") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("category", v); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Religion</Label>
              <Select value={watch("religion") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("religion", v); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Roll Number</Label>
              <Input {...register("rollNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select
                value={watch("classId") ?? ""}
                onValueChange={(v) => { if (v == null) return; setValue("classId", v, { shouldValidate: true }); setValue("sectionId", ""); }}
              >
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
              <Label>Section</Label>
              <Select value={watch("sectionId") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("sectionId", v); }} disabled={!selectedClass?.sections.length}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section">
                    {(value: string) => {
                      const section = selectedClass?.sections.find((s) => s.id === value);
                      return section ? `Section ${section.name}` : "Select section";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>House</Label>
              <Select value={watch("house") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("house", v); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {HOUSES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Previous School</Label>
              <Input {...register("previousSchool")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" {...register("mobile")} />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" {...register("transportRequired")} />
              <span className="text-sm text-gray-700">Transport Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" {...register("hostelRequired")} />
              <span className="text-sm text-gray-700">Hostel Required</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Medical Notes</Label>
            <Textarea rows={2} {...register("medicalNotes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
