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
import { formatDobAsPassword } from "@/lib/utils";
import { DOB_PASSWORD_STAFF_ROLES } from "@/lib/roles";
import { ROLE_FIELDS, type StaffRole } from "@/app/super-admin/_staff/role-fields";
import {
  nameField, emailField, mobileField, aadhaarField, panField, ifscField,
  accountNumberField, moneyField, positiveIntField, optionalTextField,
  FIELD_MAX,
} from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "TRANSPORT_MANAGER", label: "Transport Manager" },
  { value: "HR_MANAGER", label: "HR Manager" },
  { value: "WARDEN_MANAGER", label: "Warden Manager" },
  { value: "MESS_MANAGER", label: "Mess Manager" },
];

const CODE_LABEL: Partial<Record<StaffRole, string>> = { PRINCIPAL: "Principal Code" };
const CODE_PREFIX: Partial<Record<StaffRole, string>> = { PRINCIPAL: "PRN" };

const baseSchema = z.object({
  role: z.enum(["PRINCIPAL", "ACCOUNTANT", "LIBRARIAN", "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER", "MESS_MANAGER"]),
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

export function CreateStaffDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDob, setCreatedDob] = useState<string | null>(null);
  const [createdRole, setCreatedRole] = useState<StaffRole | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "dob" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(baseSchema.superRefine((data, ctx) => {
      if (data.role !== "PRINCIPAL" && !data.employeeId) {
        ctx.addIssue({ code: "custom", message: "Employee ID is required", path: ["employeeId"] });
      }
      if (DOB_PASSWORD_STAFF_ROLES.includes(data.role) && !data.dob) {
        ctx.addIssue({ code: "custom", message: "Date of birth is required", path: ["dob"] });
      }
    })),
    defaultValues: { role: "ACCOUNTANT" },
  });

  const role = watch("role");
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? "Staff";
  const hasAutoCode = role in CODE_LABEL;
  const codeLabel = CODE_LABEL[role];
  const codePrefix = CODE_PREFIX[role];
  const requiresDob = DOB_PASSWORD_STAFF_ROLES.includes(role);

  // The success dialog stays open after the form resets back to its default
  // role, so its copy must be derived from the role that was actually
  // submitted (createdRole), not the live form state.
  const createdRoleLabel = createdRole ? (ROLE_OPTIONS.find((r) => r.value === createdRole)?.label ?? "Staff") : "";
  const createdCodeLabel = createdRole ? CODE_LABEL[createdRole] : undefined;
  const createdRequiresDob = createdRole ? DOB_PASSWORD_STAFF_ROLES.includes(createdRole) : false;

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
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || `Failed to add ${roleLabel.toLowerCase()}`);
        return;
      }
      toast.success(`${roleLabel} added successfully`);
      setCreatedCode(json.data?.employeeId ?? null);
      setCreatedDob(json.data?.dob ?? null);
      setCreatedRole(data.role);
      reset({ role: "ACCOUNTANT" });
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
        if (!v) reset({ role: "ACCOUNTANT" });
      }}
    >
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Staff
      </DialogTrigger>

      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select
              value={role}
              onValueChange={(v) => { if (v != null) setValue("role", v as StaffRole, { shouldValidate: true }); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role">
                  {(value: StaffRole) => ROLE_OPTIONS.find((r) => r.value === value)?.label ?? "Select role"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {hasAutoCode && (
            <div className="space-y-1.5">
              <Label>{codeLabel}</Label>
              <Input value={`Auto-generated (e.g. X-${codePrefix}00001)`} disabled className="text-gray-400" />
            </div>
          )}

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

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) { setCreatedCode(null); setCreatedDob(null); setCreatedRole(null); } }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{createdRoleLabel} Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this {(createdCodeLabel ?? "employee id").toLowerCase()} with the {createdRoleLabel.toLowerCase()} to log in.
          {createdRequiresDob && " The password is their date of birth (DDMMYYYY)."}
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{createdCodeLabel ?? "Employee ID"}</Label>
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
          <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setCreatedCode(null); setCreatedDob(null); setCreatedRole(null); }}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </>
  );
}
