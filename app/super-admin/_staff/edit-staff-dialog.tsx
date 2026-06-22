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
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ROLE_FIELDS, type StaffRole } from "./role-fields";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
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

type FormValues = z.infer<typeof schema>;

export interface EditableStaff {
  id: string;
  employeeId: string;
  department: string | null;
  designation: string | null;
  joiningDate: Date | string | null;
  salary: number | null;
  pan: string | null;
  aadhaar: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  qualification: string | null;
  experienceYears: number | null;
  licenseNumber: string | null;
  vehicleNumber: string | null;
  assignedBlock: string | null;
  school: { name: string; code: string };
  user: { name: string; email: string | null; mobile: string | null; isActive: boolean };
}

interface Props {
  role: StaffRole;
  roleLabel: string;
  staff: EditableStaff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStaffDialog({ role, roleLabel, staff, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: staff.user.name,
      email: staff.user.email || "",
      mobile: staff.user.mobile || "",
      department: staff.department || "",
      designation: staff.designation || "",
      joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split("T")[0] : "",
      salary: staff.salary != null ? String(staff.salary) : "",
      pan: staff.pan || "",
      aadhaar: staff.aadhaar || "",
      bankName: staff.bankName || "",
      accountNumber: staff.accountNumber || "",
      ifscCode: staff.ifscCode || "",
      qualification: staff.qualification || "",
      experienceYears: staff.experienceYears != null ? String(staff.experienceYears) : "",
      licenseNumber: staff.licenseNumber || "",
      vehicleNumber: staff.vehicleNumber || "",
      assignedBlock: staff.assignedBlock || "",
    });
  }, [open, staff, reset]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/staff/${staff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          salary: data.salary ? Number(data.salary) : undefined,
          experienceYears: data.experienceYears ? Number(data.experienceYears) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || `Failed to update ${roleLabel.toLowerCase()}`);
        return;
      }
      toast.success(`${roleLabel} updated`);
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
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {roleLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">
          {staff.school.name} ({staff.school.code}) · {role === "PRINCIPAL" ? "Principal Code" : "Employee ID"} {staff.employeeId}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input type="tel" {...register("mobile")} />
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
            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input type="number" {...register("salary")} />
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-2">Payroll &amp; Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input {...register("pan")} />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar No.</Label>
              <Input {...register("aadhaar")} />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input {...register("bankName")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input {...register("accountNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code</Label>
              <Input {...register("ifscCode")} />
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
