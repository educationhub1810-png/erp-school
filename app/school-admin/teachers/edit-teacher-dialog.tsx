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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  qualification: z.string().optional(),
  experienceYears: z.string().optional(),
  specialization: z.string().optional(),
  salary: z.string().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface EditableTeacher {
  id: string;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  qualification: string | null;
  experienceYears: number | null;
  specialization: string | null;
  salary: number | null;
  pan: string | null;
  aadhaar: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  user: { name: string; email: string | null; mobile: string | null };
}

interface Props {
  teacher: EditableTeacher;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeacherDialog({ teacher, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: teacher.user.name,
      email: teacher.user.email || "",
      mobile: teacher.user.mobile || "",
      gender: teacher.gender ?? undefined,
      qualification: teacher.qualification || "",
      experienceYears: teacher.experienceYears != null ? String(teacher.experienceYears) : "",
      specialization: teacher.specialization || "",
      salary: teacher.salary != null ? String(teacher.salary) : "",
      pan: teacher.pan || "",
      aadhaar: teacher.aadhaar || "",
      bankName: teacher.bankName || "",
      accountNumber: teacher.accountNumber || "",
      ifscCode: teacher.ifscCode || "",
    });
  }, [open, teacher, reset]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          experienceYears: data.experienceYears ? Number(data.experienceYears) : undefined,
          salary: data.salary ? Number(data.salary) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update teacher");
        return;
      }
      toast.success("Teacher updated");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={watch("gender") ?? ""} onValueChange={(v) => { if (v == null) return; setValue("gender", v as "MALE" | "FEMALE" | "OTHER"); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" {...register("mobile")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Qualification</Label>
              <Input {...register("qualification")} />
            </div>
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input {...register("specialization")} />
            </div>
            <div className="space-y-1.5">
              <Label>Experience (years)</Label>
              <Input type="number" min={0} {...register("experienceYears")} />
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-1">Payroll &amp; Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Salary</Label>
              <Input type="number" min={0} {...register("salary")} />
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input {...register("pan")} />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar No.</Label>
              <Input {...register("aadhaar")} />
            </div>
          </div>
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
