"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { UserPlus, Loader2, ChevronRight, ChevronLeft, Check, Upload, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDobAsPassword } from "@/lib/utils";
import { getStudentAvatarSrc } from "@/lib/student-avatar";
import { nameField, optionalTextField, emailField, mobileField, aadhaarField, addressField, pincodeField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";
import { INDIAN_STATES } from "@/lib/indian-states";

const MAX_PHOTO_BYTES = 1_500_000;

const schema = z.object({
  schoolId: z.string().min(1, "School is required"),
  // Step 1: Personal
  firstName: nameField("First name"),
  middleName: optionalTextField("Middle name"),
  lastName: nameField("Last name"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  aadhaar: aadhaarField(),
  photoUrl: z.string().optional(),
  // Step 2: Academic
  rollNumber: optionalTextField("Roll number"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  admissionDate: z.string().optional(),
  previousSchool: optionalTextField("Previous school"),
  transportRequired: z.boolean(),
  hostelRequired: z.boolean(),
  // Step 3: Contact
  email: emailField(),
  mobile: mobileField(),
  addressLine1: addressField(),
  addressLine2: optionalTextField("Address line 2"),
  zipCode: pincodeField(),
  city: optionalTextField("City"),
  state: z.string().optional(),
  country: optionalTextField("Country"),
  // Step 4: Parents
  fatherName: optionalTextField("Father's name"),
  fatherMobile: mobileField(),
  fatherEmail: emailField(),
  fatherOccupation: optionalTextField("Father's occupation"),
  motherName: optionalTextField("Mother's name"),
  motherMobile: mobileField(),
  motherEmail: emailField(),
  motherOccupation: optionalTextField("Mother's occupation"),
  guardianName: optionalTextField("Guardian's name"),
  guardianMobile: mobileField(),
  guardianRelation: optionalTextField("Guardian's relation"),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Personal", "Academic", "Contact", "Parents"];
const FIELD_STEP: Partial<Record<keyof FormValues, number>> = {
  schoolId: 0, firstName: 0, lastName: 0, gender: 0, dob: 0,
  classId: 1,
  email: 2, mobile: 2, addressLine1: 2, addressLine2: 2, zipCode: 2, city: 2, state: 2, country: 2,
  fatherName: 3, fatherMobile: 3, fatherEmail: 3, fatherOccupation: 3,
  motherName: 3, motherMobile: 3, motherEmail: 3, motherOccupation: 3,
  guardianName: 3, guardianMobile: 3, guardianRelation: 3,
};
const STEP_FIELDS: (keyof FormValues)[][] = [
  ["schoolId", "firstName", "lastName", "gender", "dob"],
  ["classId"],
  ["email"],
  [],
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Other"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];

interface School {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface Props {
  schools: School[];
  /** Pre-select a school (e.g. when triggered from that school's row) — the dropdown still shows, just defaulted. */
  defaultSchoolId?: string;
  /** Override the trigger button's contents; the underlying Button/DialogTrigger stay the same. */
  triggerContent?: ReactNode;
  /** Extra classes for the trigger button (only applied alongside triggerContent). */
  triggerClassName?: string;
  /** Disable the trigger entirely (e.g. for an inactive school). */
  disabled?: boolean;
}

export function CreateStudentDialog({ schools, defaultSchoolId, triggerContent, triggerClassName, disabled }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDob, setCreatedDob] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "dob" | null>(null);

  const { register, handleSubmit, trigger, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      schoolId: defaultSchoolId ?? "",
      classId: "",
      sectionId: "",
      gender: "MALE",
      dob: "",
      transportRequired: false,
      hostelRequired: false,
      admissionDate: new Date().toISOString().split("T")[0],
      country: "India",
    },
  });

  const selectedSchoolId = watch("schoolId");
  const selectedClassId = watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const photoUrl = watch("photoUrl");
  const gender = watch("gender");
  const codePreviewLetter = (schools.find((s) => s.id === selectedSchoolId)?.name.trim()[0] || "X").toUpperCase();

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
    if (!selectedSchoolId) {
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    fetch(`/api/v1/classes?schoolId=${selectedSchoolId}`)
      .then((res) => res.json())
      .then((json) => setClasses(json.data ?? []))
      .finally(() => setClassesLoading(false));
  }, [selectedSchoolId]);

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
      setCreatedCode(json.data?.studentCode ?? null);
      setCreatedDob(json.data?.dob ?? null);
      reset();
      setStep(0);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleCopy = async (field: "code" | "dob", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const onInvalid = (invalidFields: typeof errors) => {
    const steps = Object.keys(invalidFields).map((key) => FIELD_STEP[key as keyof FormValues] ?? 0);
    if (steps.length) setStep(Math.min(...steps));
  };

  const handleFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && step < STEPS.length - 1) e.preventDefault();
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v, eventDetails) => {
        if (!v && eventDetails.reason !== "close-press") return;
        setOpen(v);
        if (!v) { reset(); setStep(0); setClasses([]); }
      }}
    >
      <DialogTrigger render={<Button disabled={disabled} variant={triggerContent ? "outline" : "default"} size={triggerContent ? "icon-sm" : "default"} className={triggerContent ? cn(triggerClassName) : "bg-indigo-600 hover:bg-indigo-700"} />}>
        {triggerContent ?? (<><UserPlus className="w-4 h-4 mr-2" /> Add Student</>)}
      </DialogTrigger>

      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] flex flex-col">
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

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} onKeyDown={handleFormKeyDown} className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-1">

            {/* Step 1: Personal */}
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label>Student Code</Label>
                  <Input value={`Auto-generated (e.g. ${codePreviewLetter}-STD00001)`} disabled className="text-gray-400" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>School *</Label>
                    <Select
                      value={selectedSchoolId}
                      onValueChange={(v) => {
                        setValue("schoolId", v as string, { shouldValidate: true });
                        setValue("classId", "");
                        setValue("sectionId", "");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select school">
                          {(value: string) => {
                            const school = schools.find((s) => s.id === value);
                            return school ? `${school.name} (${school.code})` : "Select school";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.schoolId && <p className="text-xs text-red-500">{errors.schoolId.message}</p>}
                  </div>

                  <div className="flex items-center gap-4">
                    <Avatar className="size-24">
                      <AvatarImage src={getStudentAvatarSrc(photoUrl, gender)} alt="Student photo" />
                    </Avatar>
                    <div className="space-y-1.5">
                      <Label>Student Photo</Label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" nativeButton={false} render={<label className="cursor-pointer" />}>
                          <Upload className="w-4 h-4 mr-1.5" /> Upload Photo
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("firstName")} />
                    {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Middle Name</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("middleName")} />
                    {errors.middleName && <p className="text-xs text-red-500">{errors.middleName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name *</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("lastName")} />
                    {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Gender *</Label>
                    <Select defaultValue="MALE" onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
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
                    <Select onValueChange={(v) => setValue("bloodGroup", v as string)}>
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
                    <Select onValueChange={(v) => setValue("category", v as string)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Religion</Label>
                    <Select onValueChange={(v) => setValue("religion", v as string)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Aadhaar No.</Label>
                    <Input placeholder="XXXX XXXX XXXX" inputMode="numeric" maxLength={FIELD_MAX.aadhaar} onKeyDown={digitsOnlyKeyDown} {...register("aadhaar")} />
                    {errors.aadhaar && <p className="text-xs text-red-500">{errors.aadhaar.message}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Academic */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Roll Number</Label>
                    <Input placeholder="01" maxLength={FIELD_MAX.shortText} {...register("rollNumber")} />
                    {errors.rollNumber && <p className="text-xs text-red-500">{errors.rollNumber.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Class *</Label>
                    <Select
                      value={selectedClassId}
                      disabled={!selectedSchoolId || classesLoading}
                      onValueChange={(v) => { if (v == null) return; setValue("classId", v, { shouldValidate: true }); setValue("sectionId", ""); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={!selectedSchoolId ? "Select school first" : classesLoading ? "Loading..." : "Select class"}>
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
                    <Select
                      value={watch("sectionId")}
                      onValueChange={(v) => { if (v == null) return; setValue("sectionId", v); }}
                      disabled={!selectedClass?.sections.length}
                    >
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
                    <Label>Admission Date</Label>
                    <DatePicker value={watch("admissionDate")} onChange={(v) => setValue("admissionDate", v)} placeholder="Select admission date" disableFuture />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Previous School</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("previousSchool")} />
                    {errors.previousSchool && <p className="text-xs text-red-500">{errors.previousSchool.message}</p>}
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
              </>
            )}

            {/* Step 3: Contact */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="student@email.com" maxLength={FIELD_MAX.email} {...register("email")} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("mobile")} />
                    {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Address Line 1</Label>
                    <Input placeholder="Building, Street, Area" maxLength={FIELD_MAX.address} {...register("addressLine1")} />
                    {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address Line 2</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("addressLine2")} />
                    {errors.addressLine2 && <p className="text-xs text-red-500">{errors.addressLine2.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("city")} />
                    {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={watch("state") ?? ""} onValueChange={(v) => { if (v != null) setValue("state", v as string); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Zip Code</Label>
                    <Input inputMode="numeric" placeholder="110001" maxLength={FIELD_MAX.pincode} onKeyDown={digitsOnlyKeyDown} {...register("zipCode")} />
                    {errors.zipCode && <p className="text-xs text-red-500">{errors.zipCode.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("country")} />
                    {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Parents */}
            {step === 3 && (
              <>
                <p className="text-xs text-gray-400">All fields on this step are optional.</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label>Father&apos;s Name</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("fatherName")} />
                    {errors.fatherName && <p className="text-xs text-red-500">{errors.fatherName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father&apos;s Mobile</Label>
                    <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("fatherMobile")} />
                    {errors.fatherMobile && <p className="text-xs text-red-500">{errors.fatherMobile.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father&apos;s Email</Label>
                    <Input type="email" maxLength={FIELD_MAX.email} {...register("fatherEmail")} />
                    {errors.fatherEmail && <p className="text-xs text-red-500">{errors.fatherEmail.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Father&apos;s Occupation</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("fatherOccupation")} />
                    {errors.fatherOccupation && <p className="text-xs text-red-500">{errors.fatherOccupation.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mother&apos;s Name</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("motherName")} />
                    {errors.motherName && <p className="text-xs text-red-500">{errors.motherName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother&apos;s Mobile</Label>
                    <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("motherMobile")} />
                    {errors.motherMobile && <p className="text-xs text-red-500">{errors.motherMobile.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother&apos;s Email</Label>
                    <Input type="email" maxLength={FIELD_MAX.email} {...register("motherEmail")} />
                    {errors.motherEmail && <p className="text-xs text-red-500">{errors.motherEmail.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mother&apos;s Occupation</Label>
                    <Input maxLength={FIELD_MAX.shortText} {...register("motherOccupation")} />
                    {errors.motherOccupation && <p className="text-xs text-red-500">{errors.motherOccupation.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Guardian&apos;s Name</Label>
                    <Input maxLength={FIELD_MAX.name} {...register("guardianName")} />
                    {errors.guardianName && <p className="text-xs text-red-500">{errors.guardianName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guardian&apos;s Mobile</Label>
                    <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("guardianMobile")} />
                    {errors.guardianMobile && <p className="text-xs text-red-500">{errors.guardianMobile.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guardian&apos;s Relation</Label>
                    <Input placeholder="e.g. Uncle, Grandparent" maxLength={FIELD_MAX.shortText} {...register("guardianRelation")} />
                    {errors.guardianRelation && <p className="text-xs text-red-500">{errors.guardianRelation.message}</p>}
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
              <Button
                type="button"
                onClick={handleSubmit(onSubmit, onInvalid)}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Student
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) { setCreatedCode(null); setCreatedDob(null); } }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Student Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this student code with the student to log in. The password is their date of birth (DDMMYYYY).
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Student Code</Label>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
              <span className="font-mono text-base font-semibold tracking-wide">{createdCode}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => createdCode && handleCopy("code", createdCode)}>
                {copiedField === "code" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copiedField === "code" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {createdDob && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date of Birth</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-base font-semibold tracking-wide">
                  {formatDobAsPassword(createdDob)}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopy("dob", formatDobAsPassword(createdDob))}>
                  {copiedField === "dob" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedField === "dob" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setCreatedCode(null); setCreatedDob(null); }}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
