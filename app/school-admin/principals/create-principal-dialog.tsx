"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { UserPlus, Loader2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { ErrorDialog } from "@/components/shared/error-dialog";
import { formatDobAsPassword } from "@/lib/utils";
import { ROLE_FIELDS } from "@/app/super-admin/_staff/role-fields";
import {
  nameField, emailField, mobileField, aadhaarField, panField,
  moneyField, positiveIntField, optionalTextField, FIELD_MAX,
} from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const schema = z.object({
  name: nameField(),
  email: emailField(),
  mobile: mobileField(),
  dob: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: moneyField("Salary"),
  pan: panField(),
  aadhaar: aadhaarField(),
  qualification: optionalTextField("Qualification"),
  experienceYears: positiveIntField("Experience (years)", { max: 60 }),
}).superRefine((data, ctx) => {
  if (!data.dob) ctx.addIssue({ code: "custom", message: "Date of birth is required", path: ["dob"] });
});

type FormInput = z.input<typeof schema>;
type FormValues = z.infer<typeof schema>;

interface Props {
  schoolName: string;
  principalName?: string | null;
}

export function CreatePrincipalDialog({ schoolName, principalName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDob, setCreatedDob] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "dob" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codePreviewLetter = (schoolName.trim()[0] || "X").toUpperCase();

  const lastAutoFilledNameRef = useRef("");

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: principalName ?? "" },
  });

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
        body: JSON.stringify({ ...data, role: "PRINCIPAL" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || "Failed to add principal");
        return;
      }
      toast.success("Principal added successfully");
      setCreatedCode(json.data?.employeeId ?? null);
      setCreatedDob(json.data?.dob ?? null);
      reset();
      lastAutoFilledNameRef.current = "";
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
        if (!v) { reset(); lastAutoFilledNameRef.current = ""; }
      }}
    >
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Principal
      </DialogTrigger>

      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Principal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Principal Code</Label>
            <Input value={`Auto-generated (e.g. ${codePreviewLetter}-PRN00001)`} disabled className="text-gray-400" />
          </div>

          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input maxLength={FIELD_MAX.name} {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="principal@school.com" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("mobile")} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth *</Label>
              <DatePicker value={watch("dob")} onChange={(v) => setValue("dob", v, { shouldValidate: true })} placeholder="Select date of birth" disableFuture />
              {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Principal Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLE_FIELDS["PRINCIPAL"].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  maxLength={field.type === "number" ? undefined : FIELD_MAX.shortText}
                  {...register(field.key as "qualification" | "experienceYears")}
                />
                {errors[field.key as keyof FormValues] && (
                  <p className="text-xs text-red-500">{(errors[field.key as keyof FormValues] as { message?: string })?.message}</p>
                )}
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
              <Input type="number" placeholder="60000" {...register("salary")} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Principal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) { setCreatedCode(null); setCreatedDob(null); } }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Principal Added Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this principal code with the principal to log in. The password is their date of birth (DDMMYYYY).
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Principal Code</Label>
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
              <Label className="text-xs text-muted-foreground">Date of Birth (login password)</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-base font-semibold tracking-wide">{formatDobAsPassword(createdDob)}</span>
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
