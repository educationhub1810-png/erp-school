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
import { ROLE_FIELDS, type StaffRole } from "@/app/super-admin/_staff/role-fields";

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

export function CreateStaffDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(baseSchema.superRefine((data, ctx) => {
      if (data.role !== "PRINCIPAL" && !data.employeeId) {
        ctx.addIssue({ code: "custom", message: "Employee ID is required", path: ["employeeId"] });
      }
    })),
    defaultValues: { role: "ACCOUNTANT" },
  });

  const role = watch("role");
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? "Staff";
  const hasAutoCode = role in CODE_LABEL;
  const codeLabel = CODE_LABEL[role];
  const codePrefix = CODE_PREFIX[role];

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField("code");
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

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) setCreatedCode(null); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{roleLabel} Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this {(codeLabel ?? "employee id").toLowerCase()} with the {roleLabel.toLowerCase()} to log in.
        </p>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{codeLabel ?? "Employee ID"}</Label>
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
            <span className="font-mono text-base font-semibold tracking-wide">{createdCode}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => createdCode && handleCopy(createdCode)}>
              {copiedField === "code" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedField === "code" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreatedCode(null)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </>
  );
}
