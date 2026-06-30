"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserPlus, Loader2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { ErrorDialog } from "@/components/shared/error-dialog";
import { formatDobAsPassword } from "@/lib/utils";
import { optionalTextField, emailField, mobileField, aadhaarField, panField, addressField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const personSchema = z.object({
  firstName: z.string().trim().max(FIELD_MAX.name, "First name is too long").optional(),
  middleName: optionalTextField("Middle name"),
  lastName: z.string().trim().max(FIELD_MAX.name, "Last name is too long").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: optionalTextField("Nationality"),
  aadhaar: aadhaarField(),
  pan: panField(),
  address: addressField(),
  email: emailField(),
  mobile: mobileField(),
});

const ROLES = ["father", "mother", "guardian"] as const;
type Role = (typeof ROLES)[number];
const ROLE_LABEL: Record<Role, string> = { father: "Father", mother: "Mother", guardian: "Guardian" };

const schema = z.object({
  schoolId: z.string().min(1, "School is required"),
  classId: z.string().min(1, "Class is required"),
  studentId: z.string().min(1, "Student is required"),
  includeFather: z.boolean(),
  includeMother: z.boolean(),
  includeGuardian: z.boolean(),
  father: personSchema,
  mother: personSchema,
  guardian: personSchema,
}).superRefine((data, ctx) => {
  if (!data.includeFather && !data.includeMother && !data.includeGuardian) {
    ctx.addIssue({ code: "custom", message: "Include at least one of Father, Mother, or Guardian", path: ["includeFather"] });
  }
  for (const role of ROLES) {
    const included = data[`include${role.charAt(0).toUpperCase()}${role.slice(1)}` as `include${"Father" | "Mother" | "Guardian"}`];
    if (!included) continue;
    const person = data[role];
    if (!person.firstName) ctx.addIssue({ code: "custom", message: "First name is required", path: [role, "firstName"] });
    if (!person.lastName) ctx.addIssue({ code: "custom", message: "Last name is required", path: [role, "lastName"] });
    if (!person.gender) ctx.addIssue({ code: "custom", message: "Gender is required", path: [role, "gender"] });
  }
});

type FormValues = z.infer<typeof schema>;

interface School {
  id: string;
  name: string;
  code: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
}

interface Props {
  schools: School[];
}

interface CreatedAccount {
  role: string;
  name: string;
  parentCode: string;
  dob: string | null;
}

export function CreateParentDialog({ schools }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[] | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      schoolId: "", classId: "", studentId: "",
      includeFather: false, includeMother: false, includeGuardian: false,
      father: {}, mother: {}, guardian: {},
    },
  });

  const selectedSchoolId = watch("schoolId");
  const selectedClassId = watch("classId");
  const codePreviewLetter = (schools.find((s) => s.id === selectedSchoolId)?.name.trim()[0] || "X").toUpperCase();
  const included: Record<Role, boolean> = {
    father: watch("includeFather"),
    mother: watch("includeMother"),
    guardian: watch("includeGuardian"),
  };

  useEffect(() => {
    if (!selectedSchoolId) { setClasses([]); return; }
    fetch(`/api/v1/classes?schoolId=${selectedSchoolId}`)
      .then((res) => res.json())
      .then((json) => setClasses(json.data ?? []));
  }, [selectedSchoolId]);

  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    setStudentsLoading(true);
    fetch(`/api/v1/students?classId=${selectedClassId}&limit=100`)
      .then((res) => res.json())
      .then((json) => setStudents(json.data?.students ?? []))
      .finally(() => setStudentsLoading(false));
  }, [selectedClassId]);

  const handleCopy = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        schoolId: data.schoolId,
        studentId: data.studentId,
        father: data.includeFather ? data.father : undefined,
        mother: data.includeMother ? data.mother : undefined,
        guardian: data.includeGuardian ? data.guardian : undefined,
      };
      const res = await fetch("/api/v1/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || "Failed to add parent account(s)");
        return;
      }
      toast.success("Parent account(s) added successfully");
      setCreatedAccounts(json.data?.accounts ?? []);
      reset();
      setClasses([]);
      setStudents([]);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const renderPersonFields = (role: Role) => (
    <Card key={role} className="border shadow-none">
      <CardHeader className="pb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded"
            {...register(`include${role.charAt(0).toUpperCase()}${role.slice(1)}` as `include${"Father" | "Mother" | "Guardian"}`)}
          />
          <span className="text-sm font-semibold text-gray-900">{ROLE_LABEL[role]} Details</span>
        </label>
        {errors.includeFather && role === "father" && (
          <p className="text-xs text-red-500 mt-1">{errors.includeFather.message}</p>
        )}
      </CardHeader>
      {included[role] && (
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input maxLength={FIELD_MAX.name} {...register(`${role}.firstName`)} />
              {errors[role]?.firstName && <p className="text-xs text-red-500">{errors[role]?.firstName?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Middle Name</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register(`${role}.middleName`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input maxLength={FIELD_MAX.name} {...register(`${role}.lastName`)} />
              {errors[role]?.lastName && <p className="text-xs text-red-500">{errors[role]?.lastName?.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select
                value={watch(`${role}.gender`) ?? ""}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue(`${role}.gender`, v as "MALE" | "FEMALE" | "OTHER", { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors[role]?.gender && <p className="text-xs text-red-500">{errors[role]?.gender?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <DatePicker
                value={watch(`${role}.dob`)}
                onChange={(v) => setValue(`${role}.dob`, v)}
                placeholder="Select date of birth"
                disableFuture
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select
                value={watch(`${role}.maritalStatus`) ?? ""}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue(`${role}.maritalStatus`, v as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED");
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="DIVORCED">Divorced</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register(`${role}.nationality`)} placeholder="Indian" />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar Number</Label>
              <Input inputMode="numeric" maxLength={FIELD_MAX.aadhaar} onKeyDown={digitsOnlyKeyDown} {...register(`${role}.aadhaar`)} placeholder="XXXX XXXX XXXX" />
              {errors[role]?.aadhaar && <p className="text-xs text-red-500">{errors[role]?.aadhaar?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input maxLength={FIELD_MAX.pan} {...register(`${role}.pan`)} placeholder="ABCDE1234F" />
              {errors[role]?.pan && <p className="text-xs text-red-500">{errors[role]?.pan?.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input maxLength={FIELD_MAX.address} {...register(`${role}.address`)} />
            {errors[role]?.address && <p className="text-xs text-red-500">{errors[role]?.address?.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder={`${ROLE_LABEL[role].toLowerCase()}@email.com`} maxLength={FIELD_MAX.email} {...register(`${role}.email`)} />
              {errors[role]?.email && <p className="text-xs text-red-500">{errors[role]?.email?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register(`${role}.mobile`)} />
              {errors[role]?.mobile && <p className="text-xs text-red-500">{errors[role]?.mobile?.message}</p>}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v, eventDetails) => {
        if (!v && eventDetails.reason !== "close-press") return;
        setOpen(v);
        if (!v) { reset(); setClasses([]); setStudents([]); }
      }}
    >
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Parent
      </DialogTrigger>

      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Parent Account</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Parent Code</Label>
            <Input value={`Auto-generated per parent (e.g. ${codePreviewLetter}-PAR00001)`} disabled className="text-gray-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>School *</Label>
              <Select
                value={selectedSchoolId}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue("schoolId", v as string, { shouldValidate: true });
                  setValue("classId", "");
                  setValue("studentId", "");
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
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select
                value={selectedClassId}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue("classId", v as string, { shouldValidate: true });
                  setValue("studentId", "");
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select
                value={watch("studentId")}
                onValueChange={(v) => {
                  if (v == null) return;
                  setValue("studentId", v as string, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={studentsLoading ? "Loading..." : "Select student"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-red-500">{errors.studentId.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => renderPersonFields(role))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Parent(s)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!createdAccounts} onOpenChange={(o) => { if (!o) setCreatedAccounts(null); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Parent Account(s) Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share each parent code with them to log in. Default password: Parent@123.
        </p>
        <div className="space-y-3">
          {createdAccounts?.map((a) => (
            <div key={a.role} className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{ROLE_LABEL[a.role as Role]} · {a.name}</p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Parent Code</Label>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                  <span className="font-mono text-base font-semibold tracking-wide">{a.parentCode}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(`${a.role}-code`, a.parentCode)}>
                    {copiedField === `${a.role}-code` ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {copiedField === `${a.role}-code` ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              {a.dob && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                    <span className="font-mono text-base font-semibold tracking-wide">
                      {formatDobAsPassword(a.dob!)}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(`${a.role}-dob`, formatDobAsPassword(a.dob!))}>
                      {copiedField === `${a.role}-dob` ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copiedField === `${a.role}-dob` ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreatedAccounts(null)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </>
  );
}
