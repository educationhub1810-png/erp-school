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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  // Step 1: Personal
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  aadhaar: z.string().optional(),
  // Step 2: Academic
  rollNumber: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  admissionDate: z.string().optional(),
  house: z.string().optional(),
  previousSchool: z.string().optional(),
  transportRequired: z.boolean(),
  hostelRequired: z.boolean(),
  medicalNotes: z.string().optional(),
  // Step 3: Contact
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  address: z.string().optional(),
  // Step 4: Parent
  fatherName: z.string().optional(),
  fatherMobile: z.string().optional(),
  fatherEmail: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherMobile: z.string().optional(),
  motherEmail: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  guardianMobile: z.string().optional(),
  guardianRelation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Personal", "Academic", "Contact", "Parent"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Other"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const HOUSES = ["Red", "Blue", "Green", "Yellow", "House A", "House B", "House C", "House D"];

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface Props {
  classes: Class[];
  schoolId: string;
}

export function AddStudentDialog({ classes, schoolId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "MALE",
      transportRequired: false,
      hostelRequired: false,
      admissionDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedClassId = watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add student");
        return;
      }
      toast.success("Student added successfully");
      reset();
      setStep(0);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setStep(0); } }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Student
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors",
                  i < step ? "bg-indigo-600 text-white cursor-pointer" :
                  i === step ? "bg-indigo-600 text-white" :
                  "bg-gray-200 text-gray-500"
                )}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </button>
              <span className={cn("text-xs ml-1.5 hidden sm:block", i === step ? "text-gray-900 font-medium" : "text-gray-400")}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-2", i < step ? "bg-indigo-600" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-1">

            {/* Step 1: Personal */}
            {step === 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Gender *</Label>
                    <Select defaultValue="MALE" onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date of Birth</Label>
                    <Input type="date" {...register("dob")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Blood Group</Label>
                    <Select onValueChange={(v) => setValue("bloodGroup", v as string)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select onValueChange={(v) => setValue("category", v as string)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Religion</Label>
                    <Select onValueChange={(v) => setValue("religion", v as string)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Aadhaar No.</Label>
                    <Input placeholder="XXXX XXXX XXXX" {...register("aadhaar")} />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Academic */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Student Code</Label>
                    <Input value="Auto-generated (e.g. STD00001)" disabled className="text-gray-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Roll Number</Label>
                    <Input placeholder="01" {...register("rollNumber")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Class *</Label>
                    <Select onValueChange={(v) => { setValue("classId", v as string); setValue("sectionId", ""); }}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Section</Label>
                    <Select onValueChange={(v) => setValue("sectionId", v as string)} disabled={!selectedClass?.sections.length}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Admission Date</Label>
                    <Input type="date" {...register("admissionDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>House</Label>
                    <Select onValueChange={(v) => setValue("house", v as string)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Textarea rows={2} placeholder="Any medical conditions or allergies..." {...register("medicalNotes")} />
                </div>
              </>
            )}

            {/* Step 3: Contact */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="student@email.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input type="tel" placeholder="9876543210" {...register("mobile")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea rows={3} placeholder="Full address..." {...register("address")} />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    A login account will be created with the email above. Default password: <strong>Student@123</strong>
                  </p>
                </div>
              </>
            )}

            {/* Step 4: Parent */}
            {step === 3 && (
              <>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Father's Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Father's Name</Label>
                    <Input {...register("fatherName")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input type="tel" {...register("fatherMobile")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" {...register("fatherEmail")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Occupation</Label>
                    <Input {...register("fatherOccupation")} />
                  </div>
                </div>

                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Mother's Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mother's Name</Label>
                    <Input {...register("motherName")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input type="tel" {...register("motherMobile")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" {...register("motherEmail")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Occupation</Label>
                    <Input {...register("motherOccupation")} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 mt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Student
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
