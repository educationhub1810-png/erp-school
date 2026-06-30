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
import { Plus, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { nameField, emailField, mobileField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

interface School {
  id: string;
  name: string;
  code: string;
}

const schema = z.object({
  schoolId: z.string().min(1, "School is required"),
  name: nameField(),
  email: emailField(),
  mobile: mobileField(),
}).refine((d) => d.email || d.mobile, { message: "Email or mobile is required", path: ["email"] });

type FormValues = z.infer<typeof schema>;

export function CreateSchoolAdminDialog({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; loginId: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolId: "", name: "", email: "", mobile: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "SCHOOL_ADMIN" }),
      });
      const json: { data?: { user?: { name?: string; email?: string }; defaultPassword?: string }; error?: string } = await res.json();
      if (!res.ok) {
        setError(json.error || `Request failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`School Admin "${json.data?.user?.name}" added`);
      reset();
      setOpen(false);
      if (json.data?.defaultPassword) {
        setCredentials({
          name: json.data.user?.name ?? "School Admin",
          loginId: json.data.user?.email ?? data.email ?? data.mobile ?? "—",
          password: json.data.defaultPassword,
        });
      }
      router.refresh();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
        <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
          <Plus className="w-4 h-4 mr-2" /> Add School Admin
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>School *</Label>
              <Select value={watch("schoolId") ?? ""} onValueChange={(v) => { if (v != null) setValue("schoolId", v as string); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a school">
                    {(value: string) => schools.find((s) => s.id === value)?.name ?? "Select a school"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.schoolId && <p className="text-xs text-red-500">{errors.schoolId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Anita Desai" maxLength={FIELD_MAX.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@school.com" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                maxLength={FIELD_MAX.mobile}
                onKeyDown={digitsOnlyKeyDown}
                {...register("mobile")}
              />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add School Admin
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(o) => { if (!o) setCredentials(null); }}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>School Admin Added — Login Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share these credentials with <span className="font-medium">{credentials?.name}</span>. They log in with
            their email/mobile and this password — advise them to change it after first login. This password
            can&apos;t be shown again.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Login ID (email or mobile)</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-sm font-semibold tracking-wide break-all">{credentials?.loginId}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => credentials && copy("loginId", credentials.loginId)}>
                  {copiedField === "loginId" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedField === "loginId" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Temporary password</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-sm font-semibold tracking-wide break-all">{credentials?.password}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => credentials && copy("password", credentials.password)}>
                  {copiedField === "password" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedField === "password" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
