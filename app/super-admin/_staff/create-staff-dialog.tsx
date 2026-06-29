"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { cn, formatDobAsPassword } from "@/lib/utils";
import { DOB_PASSWORD_STAFF_ROLES } from "@/lib/roles";
import { ROLE_FIELDS, type StaffRole } from "./role-fields";
import {
  nameField, emailField, mobileField, aadhaarField, panField, ifscField,
  accountNumberField, moneyField, positiveIntField, optionalTextField,
  FIELD_MAX,
} from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const baseSchema = z.object({
  schoolId: z.string().min(1, "School is required"),
  name: nameField(),
  email: emailField(),
  mobile: mobileField(),
  employeeId: optionalTextField("Employee ID"),
  department: optionalTextField("Department"),
  designation: optionalTextField("Designation"),
  dob: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: moneyField("Salary"),
  pan: panField(),
  aadhaar: aadhaarField(),
  bankName: optionalTextField("Bank name"),
  accountNumber: accountNumberField(),
  ifscCode: ifscField(),
  qualification: optionalTextField("Qualification"),
  experienceYears: positiveIntField("Experience (years)", { max: 60 }),
  licenseNumber: optionalTextField("License number"),
  vehicleNumber: optionalTextField("Vehicle number"),
  assignedBlock: optionalTextField("Assigned block"),
});

type FormInput = z.input<typeof baseSchema>;
type FormValues = z.infer<typeof baseSchema>;

interface School {
  id: string;
  name: string;
  code: string;
  principalName?: string | null;
}

interface Props {
  role: StaffRole;
  roleLabel: string;
  schools: School[];
  /** Pre-select a school (e.g. when triggered from that school's row) — the dropdown still shows, just defaulted. */
  defaultSchoolId?: string;
  /** Override the triggerContent button's contents; the underlying Button/DialogTrigger stay the same. */
  triggerContent?: ReactNode;
  /** Extra classes for the trigger button (only applied alongside triggerContent). */
  triggerClassName?: string;
  /** Disable the trigger entirely (e.g. for an inactive school). */
  disabled?: boolean;
}

const CODE_LABEL: Partial<Record<StaffRole, string>> = { PRINCIPAL: "Principal Code" };
const CODE_PREFIX: Partial<Record<StaffRole, string>> = { PRINCIPAL: "PRN" };

export function CreateStaffDialog({ role, roleLabel, schools, defaultSchoolId, triggerContent, triggerClassName, disabled }: Props) {
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
  const requiresDob = DOB_PASSWORD_STAFF_ROLES.includes(role);

  const schema = baseSchema.superRefine((data, ctx) => {
    if (!hasAutoCode && !data.employeeId) {
      ctx.addIssue({ code: "custom", message: "Employee ID is required", path: ["employeeId"] });
    }
    if (requiresDob && !data.dob) {
      ctx.addIssue({ code: "custom", message: "Date of birth is required", path: ["dob"] });
    }
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolId: defaultSchoolId ?? "", name: "" },
  });

  const selectedSchoolId = watch("schoolId");
  const codePreviewLetter = (schools.find((s) => s.id === selectedSchoolId)?.name.trim()[0] || "X").toUpperCase();

  // When adding a Principal, pre-fill the name from the school's record (set
  // when the school was created) — but only while the field still holds
  // either nothing or a previous auto-fill, so it never clobbers a name the
  // admin has actually typed.
  const lastAutoFilledNameRef = useRef("");
  const handleSchoolChange = (schoolId: string) => {
    setValue("schoolId", schoolId, { shouldValidate: true });
    if (role !== "PRINCIPAL") return;
    const school = schools.find((s) => s.id === schoolId);
    if (!school?.principalName) return;
    const currentName = watch("name");
    if (currentName === "" || currentName === lastAutoFilledNameRef.current) {
      setValue("name", school.principalName, { shouldValidate: true });
      lastAutoFilledNameRef.current = school.principalName;
    }
  };

  const handleCopy = async (field: "code" | "dob", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // A pre-selected school (e.g. from that school's row) should auto-fill the
  // Principal's name immediately, same as if the admin had just picked it.
  useEffect(() => {
    if (defaultSchoolId) handleSchoolChange(defaultSchoolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role }),
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
      <DialogTrigger render={<Button disabled={disabled} variant={triggerContent ? "outline" : "default"} size={triggerContent ? "icon-sm" : "default"} className={triggerContent ? cn(triggerClassName) : "bg-indigo-600 hover:bg-indigo-700"} />}>
        {triggerContent ?? (<><UserPlus className="w-4 h-4 mr-2" /> Add {roleLabel}</>)}
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
              onValueChange={(v) => { if (v != null) handleSchoolChange(v as string); }}
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
              <Input maxLength={FIELD_MAX.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            {!hasAutoCode && (
              <div className="space-y-1.5">
                <Label>Employee ID *</Label>
                <Input placeholder="EMP2025001" maxLength={FIELD_MAX.shortText} {...register("employeeId")} />
                {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-3 ${requiresDob ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="name@school.com" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("mobile")} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
            {requiresDob && (
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <DatePicker value={watch("dob")} onChange={(v) => setValue("dob", v, { shouldValidate: true })} placeholder="Select date of birth" disableFuture />
                {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{roleLabel} Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLE_FIELDS[role].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  maxLength={field.type === "number" ? undefined : FIELD_MAX.shortText}
                  {...register(field.key)}
                />
                {errors[field.key] && <p className="text-xs text-red-500">{errors[field.key]?.message}</p>}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <DatePicker value={watch("joiningDate")} onChange={(v) => setValue("joiningDate", v)} placeholder="Select joining date" disableFuture />
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Payroll &amp; Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input type="number" placeholder="35000" {...register("salary")} />
              {errors.salary && <p className="text-xs text-red-500">{errors.salary.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input maxLength={FIELD_MAX.pan} {...register("pan")} />
              {errors.pan && <p className="text-xs text-red-500">{errors.pan.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar No.</Label>
              <Input placeholder="XXXX XXXX XXXX" inputMode="numeric" maxLength={FIELD_MAX.aadhaar} onKeyDown={digitsOnlyKeyDown} {...register("aadhaar")} />
              {errors.aadhaar && <p className="text-xs text-red-500">{errors.aadhaar.message}</p>}
            </div>
          </div>

          {!hasAutoCode && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input maxLength={FIELD_MAX.shortText} {...register("bankName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input inputMode="numeric" maxLength={FIELD_MAX.accountNumber} onKeyDown={digitsOnlyKeyDown} {...register("accountNumber")} />
                {errors.accountNumber && <p className="text-xs text-red-500">{errors.accountNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input maxLength={FIELD_MAX.ifsc} {...register("ifscCode")} />
                {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              {requiresDob ? (
                <>A login account will be created with the email above. Password: their <strong>date of birth (DDMMYYYY)</strong>.</>
              ) : (
                <>A login account will be created with the email above. Default password: <strong>Staff@123</strong></>
              )}
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
          {requiresDob && " The password is their date of birth (DDMMYYYY)."}
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

    <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </>
  );
}
