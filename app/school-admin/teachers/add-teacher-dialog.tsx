"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  qualification: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  specialization: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.number().min(0).optional(),
  employeeId: z.string().min(1, "Employee ID required"),
});

type FormValues = z.infer<typeof schema>;

export function AddTeacherDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { joiningDate: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add teacher");
        return;
      }
      toast.success("Teacher added successfully");
      reset();
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Add Teacher
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Priya Singh" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Employee ID *</Label>
              <Input placeholder="EMP001" {...register("employeeId")} />
              {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="teacher@school.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" placeholder="9876543210" {...register("mobile")} />
            </div>

            <div className="space-y-1.5">
              <Label>Qualification</Label>
              <Input placeholder="M.Sc Mathematics" {...register("qualification")} />
            </div>

            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input placeholder="Mathematics" {...register("specialization")} />
            </div>

            <div className="space-y-1.5">
              <Label>Experience (years)</Label>
              <Input type="number" min={0} {...register("experienceYears", { setValueAs: (v) => v === "" || v == null ? undefined : parseInt(v, 10) })} />
            </div>

            <div className="space-y-1.5">
              <Label>Monthly Salary (₹)</Label>
              <Input type="number" min={0} placeholder="45000" {...register("salary", { setValueAs: (v) => v === "" || v == null ? undefined : parseFloat(v) })} />
            </div>

            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input type="date" {...register("joiningDate")} />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">Default login password: <strong>Teacher@123</strong></p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Teacher
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
