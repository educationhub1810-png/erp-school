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
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nameField, optionalTextField, emailField, mobileField, aadhaarField, panField, addressField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const schema = z.object({
  parentType: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
  firstName: nameField("First name"),
  middleName: optionalTextField("Middle name"),
  lastName: nameField("Last name"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: optionalTextField("Nationality"),
  aadhaar: aadhaarField(),
  pan: panField(),
  address: addressField(),
  email: emailField(),
  mobile: mobileField(),
});

type FormValues = z.infer<typeof schema>;

export interface EditableParent {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  isActive: boolean;
  school: { name: string; code: string } | null;
  parentProfile: {
    parentCode: string;
    parentType: "FATHER" | "MOTHER" | "GUARDIAN";
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    dob: string | null;
    maritalStatus: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | null;
    nationality: string | null;
    aadhaar: string | null;
    pan: string | null;
    address: string | null;
    student: { firstName: string; lastName: string; studentCode: string } | null;
  } | null;
}

interface Props {
  parent: EditableParent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditParentDialog({ parent, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    const p = parent.parentProfile;
    reset({
      parentType: p?.parentType ?? "FATHER",
      firstName: p?.firstName ?? "",
      middleName: p?.middleName ?? "",
      lastName: p?.lastName ?? "",
      gender: p?.gender ?? "MALE",
      dob: p?.dob ? p.dob.slice(0, 10) : "",
      maritalStatus: p?.maritalStatus ?? undefined,
      nationality: p?.nationality ?? "",
      aadhaar: p?.aadhaar ?? "",
      pan: p?.pan ?? "",
      address: p?.address ?? "",
      email: parent.email || "",
      mobile: parent.mobile || "",
    });
  }, [open, parent, reset]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/parents/${parent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update parent account");
        return;
      }
      toast.success("Parent account updated");
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
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Parent Account</DialogTitle>
        </DialogHeader>
        <div className="-mt-2 flex items-center gap-3 text-xs text-gray-500">
          {parent.parentProfile && <span className="font-mono font-medium text-gray-700">{parent.parentProfile.parentCode}</span>}
          {parent.school && <span>{parent.school.name} ({parent.school.code})</span>}
          {parent.parentProfile?.student && (
            <span>
              Child: {parent.parentProfile.student.firstName} {parent.parentProfile.student.lastName} ({parent.parentProfile.student.studentCode})
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Parent Type *</Label>
            <Select
              value={watch("parentType") ?? ""}
              onValueChange={(v) => { if (v != null) setValue("parentType", v as FormValues["parentType"]); }}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FATHER">Father</SelectItem>
                <SelectItem value="MOTHER">Mother</SelectItem>
                <SelectItem value="GUARDIAN">Guardian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input maxLength={FIELD_MAX.name} {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Middle Name</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register("middleName")} />
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
              <Select
                value={watch("gender") ?? ""}
                onValueChange={(v) => { if (v != null) setValue("gender", v as FormValues["gender"]); }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <DatePicker
                value={watch("dob")}
                onChange={(v) => setValue("dob", v)}
                placeholder="Select date of birth"
                disableFuture
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select
                value={watch("maritalStatus") ?? ""}
                onValueChange={(v) => { if (v != null) setValue("maritalStatus", v as FormValues["maritalStatus"]); }}
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
              <Input maxLength={FIELD_MAX.shortText} {...register("nationality")} placeholder="Indian" />
              {errors.nationality && <p className="text-xs text-red-500">{errors.nationality.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar Number</Label>
              <Input inputMode="numeric" maxLength={FIELD_MAX.aadhaar} onKeyDown={digitsOnlyKeyDown} {...register("aadhaar")} placeholder="XXXX XXXX XXXX" />
              {errors.aadhaar && <p className="text-xs text-red-500">{errors.aadhaar.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input maxLength={FIELD_MAX.pan} {...register("pan")} placeholder="ABCDE1234F" />
              {errors.pan && <p className="text-xs text-red-500">{errors.pan.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input maxLength={FIELD_MAX.address} {...register("address")} />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" inputMode="numeric" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("mobile")} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
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
