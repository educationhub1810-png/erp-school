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
import { Plus, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "School name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  principalName: z.string().optional(),
  establishedDate: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
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

export function CreateSchoolDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDate, setCreatedDate] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "date" | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: "India", timezone: "Asia/Kolkata", currency: "INR" },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      let json: { data?: { name?: string; code?: string; establishedDate?: string | null }; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        setError(`Server returned an unexpected response (HTTP ${res.status}). Check Vercel logs.`);
        return;
      }
      if (!res.ok) {
        setError(json.error || `Request failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`School "${json.data?.name}" created`);
      reset();
      setError(null);
      setOpen(false);
      setCreatedCode(json.data?.code ?? null);
      setCreatedDate(json.data?.establishedDate ?? null);
      router.refresh();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (field: "code" | "date", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Add School
      </DialogTrigger>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New School</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="col-span-3 space-y-1.5">
              <Label>School Name *</Label>
              <Input placeholder="Delhi Public School" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>School Code</Label>
              <Input value="Auto-generated (e.g. SCH00001)" disabled className="text-gray-400" />
            </div>

            <div className="space-y-1.5">
              <Label>Principal Name</Label>
              <Input placeholder="Dr. Ramesh Sharma" {...register("principalName")} />
            </div>

            <div className="space-y-1.5">
              <Label>Date of Establishment</Label>
              <DatePicker
                value={watch("establishedDate")}
                onChange={(v) => setValue("establishedDate", v)}
                placeholder="Select date of establishment"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@school.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" placeholder="9876543210" {...register("phone")} />
            </div>

            <div className="space-y-1.5">
              <Label>City</Label>
              <Input placeholder="New Delhi" {...register("city")} />
            </div>

            <div className="col-span-3 space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="Building, Street, Area" {...register("address")} />
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Select onValueChange={(v) => setValue("state", v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select defaultValue="INR" onValueChange={(v) => setValue("currency", v as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select defaultValue="Asia/Kolkata" onValueChange={(v) => setValue("timezone", v as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">IST (Asia/Kolkata)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">EST (New York)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create School
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!createdCode} onOpenChange={(o) => { if (!o) { setCreatedCode(null); setCreatedDate(null); } }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>School Created Successfully</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this school code with the school admin to log in.
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">School Code</Label>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
              <span className="font-mono text-base font-semibold tracking-wide">{createdCode}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => createdCode && handleCopy("code", createdCode)}>
                {copiedField === "code" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copiedField === "code" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {createdDate && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date of Establishment</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-base font-semibold tracking-wide">
                  {new Date(createdDate).toLocaleDateString()}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopy("date", new Date(createdDate).toLocaleDateString())}>
                  {copiedField === "date" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedField === "date" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setCreatedCode(null); setCreatedDate(null); }}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
