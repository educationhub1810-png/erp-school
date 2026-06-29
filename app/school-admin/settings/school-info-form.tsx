"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { School } from "@/lib/generated/prisma/client";
import { nameField, optionalTextField, emailField, mobileField, addressField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const schema = z.object({
  name: nameField("School name"),
  principalName: optionalTextField("Principal name"),
  email: emailField(),
  phone: mobileField(),
  address: addressField(),
  city: optionalTextField("City"),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  regNumber: optionalTextField("Registration number"),
  affiliationNumber: optionalTextField("Affiliation number"),
});

type FormValues = z.infer<typeof schema>;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

export function SchoolInfoForm({ school }: { school: School }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: school.name,
      principalName: school.principalName ?? "",
      email: school.email ?? "",
      phone: school.phone ?? "",
      address: school.address ?? "",
      city: school.city ?? "",
      state: school.state ?? "",
      country: school.country ?? "India",
      timezone: school.timezone ?? "Asia/Kolkata",
      currency: school.currency ?? "INR",
      regNumber: school.regNumber ?? "",
      affiliationNumber: school.affiliationNumber ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/schools/${school.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to update"); return; }
      toast.success("School information updated");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">School Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>School Name *</Label>
              <Input maxLength={FIELD_MAX.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register("regNumber")} />
              {errors.regNumber && <p className="text-xs text-red-500">{errors.regNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Affiliation Number</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register("affiliationNumber")} />
              {errors.affiliationNumber && <p className="text-xs text-red-500">{errors.affiliationNumber.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Principal Name</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register("principalName")} />
              {errors.principalName && <p className="text-xs text-red-500">{errors.principalName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input inputMode="numeric" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input maxLength={FIELD_MAX.shortText} {...register("city")} />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Select defaultValue={school.state ?? undefined} onValueChange={(v) => setValue("state", (v as string) || undefined)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select defaultValue={school.currency ?? "INR"} onValueChange={(v) => setValue("currency", (v as string) || undefined)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input maxLength={FIELD_MAX.address} {...register("address")} />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
