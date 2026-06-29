"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  name: string;
  email: string | null;
  mobile: string | null;
}

// Row action: edit a user's name, email and mobile. Email is the address 2FA
// login codes are sent to, so this is how an admin fixes a missing/wrong one.
// PATCHes /api/v1/users/:id.
export function EditUserAction({ userId, name, email, mobile }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, email: email ?? "", mobile: mobile ?? "" });

  const openDialog = () => {
    setForm({ name, email: email ?? "", mobile: mobile ?? "" });
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, mobile: form.mobile }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to update user");
        return;
      }
      toast.success(`${form.name} updated`);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? openDialog() : setOpen(false))}>
      <button
        onClick={openDialog}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 px-1.5 py-1 rounded transition-colors"
        title="Edit user"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user — {name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <p className="text-xs text-gray-400">Two-factor login codes are sent here.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-mobile">Mobile</Label>
            <Input
              id="edit-mobile"
              inputMode="numeric"
              placeholder="10-digit number"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
