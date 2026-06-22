"use client";

import { useState } from "react";
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
import { UserPlus, Loader2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { ErrorDialog } from "@/components/shared/error-dialog";
import { ROLE_FIELDS, type StaffRole } from "./role-fields";

const baseSchema = z.object({
  schoolId: z.string().min(1, "School is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.string().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
  assignedBlock: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

interface School {
  id: string;
  name: string;
  code: string;
}

interface Props {
  role: StaffRole;
  roleLabel: string;
  schools: School[];
}

const CODE_LABEL: Partial<Record<StaffRole, string>> = { PRINCIPAL: "Principal Code" };
const CODE_PREFIX: Partial<Record<StaffRole, string>> = { PRINCIPAL: "PRN" };

export function CreateStaffDialog({ role, roleLabel, schools }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDob, setCreatedDob] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "dob" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAutoCode = role in CODE_LABEL;
  const codeLabel = CODE_LABEL[role];
  const codePrefix = CODE_PREFIX[role];

  const schema = hasAutoCode
    ? baseSchema
    : baseSchema.superRefine((data, ctx) => {
        if (!data.employeeId) ctx.addIssue({ code: "custom", message: "Employee ID is required", path: ["employeeId"] });
      });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolId: "" },
  });

  const selectedSchoolId = watch("schoolId");
  const codePreviewLetter = (schools.find((s) => s.id === selectedSchoolId)?.name.trim()[0] || "X").toUpperCase();

  const handleCopy = async (field: "code" | "dob", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role,
          salary: data.salary ? Number(data.salary) : undefined,
          experienceYears: data.experienceYears ? Number(data.experienceYears) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || `Failed to add ${roleLabel.toLowerCase()}`);
        return;
      }
      toast.success(`${roleLabel} added successfully`);
      setCreatedCode(json.data?.employeeId ?? null);
      setCreatedDob(json.data?.dob ?? null);
      reset();
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v, eventDetails) => {
        if (!v && eventDetails.reason !== "close-press") return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add {roleLabel}
      </DialogTrigger>

      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {roleLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {hasAutoCode && (
            <div className="space-y-1.5">
              <Label>{codeLabel}</Label>
              <Input value={`Auto-generated (e.g. ${codePreviewLetter}-${codePrefix}00001)`} disabled className="text-gray-400" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>School *</Label>
            <Select
              value={selectedSchoolId}
              onValueChange={(v) => { if (v != null) setValue("schoolId", v as string, { shouldValidate: true }); }}
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

          <div className={hasAutoCode ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            {!hasAutoCode && (
              <div className="space-y-1.5">
                <Label>Employee ID *</Label>
                <Input placeholder="EMP2025001" {...register("employeeId")} />
                {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="name@school.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" placeholder="9876543210" {...register("mobile")} />
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{roleLabel} Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLE_FIELDS[role].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input type={field.type === "number" ? "number" : "text"} placeholder={field.placeholder} {...register(field.key)} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <DatePicker value={watch("joiningDate")} onChange={(v) => setValue("joiningDate", v)} placeholder="Select joining date" />
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Payroll &amp; Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input type="number" placeholder="35000" {...register("salary")} />
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input {...register("pan")} />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar No.</Label>
              <Input placeholder="XXXX XXXX XXXX" {...register("aadhaar")} />
            </div>
          </div>

          {!hasAutoCode && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input {...register("bankName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input {...register("accountNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input {...register("ifscCode")} />
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              A login account will be created with the email above. Default password: <strong>Staff@123</strong>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save {roleLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) { setCreatedCode(null); setCreatedDob(null); } }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{roleLabel} Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this {codeLabel?.toLowerCase() ?? "employee id"} with the {roleLabel.toLowerCase()} to log in.
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{codeLabel ?? "Employee ID"}</Label>
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
                  {new Date(createdDob).toLocaleDateString()}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopy("dob", new Date(createdDob).toLocaleDateString())}>
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

    <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </>
  );
}
