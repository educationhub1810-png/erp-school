"use client";

import { useEffect, useState, type ChangeEvent } from "react";
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
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getStudentAvatarSrc } from "@/lib/student-avatar";

const MAX_PHOTO_BYTES = 1_500_000;

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  photoUrl: z.string().optional(),
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

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export interface EditableStudent {
  id: string;
  schoolId: string;
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
  photoUrl: string | null;
  classId: string;
  sectionId: string | null;
  house: string | null;
  previousSchool: string | null;
  transportRequired: boolean;
  hostelRequired: boolean;
  medicalNotes: string | null;
  school: { name: string; code: string };
  class: { name: string };
  section: { name: string } | null;
  user: { email: string | null; mobile: string | null; isActive: boolean };
}

interface Props {
  student: EditableStudent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStudentDialog({ student, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedClassId = watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const photoUrl = watch("photoUrl");
  const gender = watch("gender");

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be smaller than 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue("photoUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

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
      photoUrl: student.photoUrl || "",
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

    setClassesLoading(true);
    fetch(`/api/v1/classes?schoolId=${student.schoolId}`)
      .then((res) => res.json())
      .then((json) => setClasses(json.data ?? []))
      .finally(() => setClassesLoading(false));
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
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">
          {student.school.name} ({student.school.code}) · Student Code: {student.studentCode}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={getStudentAvatarSrc(photoUrl, gender)} alt="Student photo" />
            </Avatar>
            <div className="space-y-1.5">
              <Label>Student Photo</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" nativeButton={false} render={<label className="cursor-pointer" />}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </Button>
                {photoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setValue("photoUrl", "")}>
                    <X className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">If no photo is uploaded, a default avatar based on gender is used.</p>
            </div>
          </div>

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
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
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
              <DatePicker
                value={watch("dob")}
                onChange={(v) => setValue("dob", v, { shouldValidate: true })}
                placeholder="Select date of birth"
                disableFuture
              />
              {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Select value={watch("bloodGroup")} onValueChange={(v) => setValue("bloodGroup", v as string)}>
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
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Religion</Label>
              <Select value={watch("religion")} onValueChange={(v) => setValue("religion", v as string)}>
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
                value={watch("classId")}
                disabled={classesLoading}
                onValueChange={(v) => { if (v == null) return; setValue("classId", v, { shouldValidate: true }); setValue("sectionId", ""); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={classesLoading ? "Loading..." : "Select class"}>
                    {(value: string) => classes.find((cls) => cls.id === value)?.name ?? "Select class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={watch("sectionId")} onValueChange={(v) => { if (v == null) return; setValue("sectionId", v); }} disabled={!selectedClass?.sections.length}>
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
              <Select value={watch("house")} onValueChange={(v) => setValue("house", v as string)}>
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
