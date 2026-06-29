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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";
import { nameField, emailField, mobileField, FIELD_MAX } from "@/lib/field-validation";
import { digitsOnlyKeyDown } from "@/lib/field-behavior";

const CREATABLE_ROLES = [
  "PRINCIPAL", "TEACHER", "ACCOUNTANT", "LIBRARIAN",
  "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER", "MESS_MANAGER",
] as const;

const schema = z.object({
  name: nameField(),
  email: emailField(),
  mobile: mobileField(),
  role: z.enum(CREATABLE_ROLES),
  password: z.string().min(6).max(72).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to create user"); return; }
      setCreatedPassword(json.data.defaultPassword);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedPassword(null);
    setCopied(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <UserPlus className="w-4 h-4 mr-2" /> Create User
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{createdPassword ? "User Created" : "Create New User"}</DialogTitle>
        </DialogHeader>

        {createdPassword ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                User created successfully! Share these credentials:
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Default Password</p>
                  <p className="font-mono font-semibold text-gray-900">{createdPassword}</p>
                </div>
                <Button size="sm" variant="outline" onClick={copyPassword}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-400">Ask the user to change their password after first login.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setCreatedPassword(null); reset(); }}>Create Another</Button>
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="John Doe" maxLength={FIELD_MAX.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select onValueChange={(v) => setValue("role", v as typeof CREATABLE_ROLES[number])}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {CREATABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="user@school.com" maxLength={FIELD_MAX.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={FIELD_MAX.mobile} onKeyDown={digitsOnlyKeyDown} {...register("mobile")} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Password <span className="text-gray-400 text-xs font-normal">(leave blank to auto-generate)</span></Label>
              <Input type="password" placeholder="Min 6 characters" maxLength={72} {...register("password")} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
