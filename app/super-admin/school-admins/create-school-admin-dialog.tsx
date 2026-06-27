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

interface School {
  id: string;
  name: string;
  code: string;
}

const schema = z.object({
  schoolId: z.string().min(1, "School is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
}).refine((d) => d.email || d.mobile, { message: "Email or mobile is required", path: ["email"] });

type FormValues = z.infer<typeof schema>;

export function CreateSchoolAdminDialog({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{ qr: string; secret: string; recoveryCodes: string[] } | null>(null);
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
      const json: { data?: { user?: { name?: string }; totp?: { qr: string; secret: string; recoveryCodes: string[] } }; error?: string } = await res.json();
      if (!res.ok) {
        setError(json.error || `Request failed (HTTP ${res.status})`);
        return;
      }
      toast.success(`School Admin "${json.data?.user?.name}" added`);
      reset();
      setOpen(false);
      if (json.data?.totp) setEnrollment(json.data.totp);
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
              <Input placeholder="Anita Desai" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@school.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" placeholder="9876543210" {...register("mobile")} />
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

      <Dialog open={!!enrollment} onOpenChange={(o) => { if (!o) setEnrollment(null); }}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>School Admin Added — Set Up Login</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            School Admin logs in with just an authenticator code — no password. Have the admin scan this QR code in
            Google Authenticator (or a similar app) now; this can&apos;t be shown again.
          </p>
          <div className="space-y-3">
            {enrollment?.qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={enrollment.qr} alt="Scan in your authenticator app" className="mx-auto h-40 w-40" />
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Manual key (if they can&apos;t scan)</Label>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <span className="font-mono text-sm font-semibold tracking-wide break-all">{enrollment?.secret}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => enrollment && copy("secret", enrollment.secret)}>
                  {copiedField === "secret" ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiedField === "secret" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recovery codes (each usable once — save them)</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-xs">
                {enrollment?.recoveryCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setEnrollment(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
