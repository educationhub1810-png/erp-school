"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldPlus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  name: string;
  email: string | null;
  totpEnabled: boolean;
}

interface TotpResult {
  qrDataUrl: string;
  secret: string;
  recoveryCodes: string[];
  regenerated: boolean;
}

export function UserSecurityAction({ userId, name, email, totpEnabled }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TotpResult | null>(null);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setResult(null); // never keep secrets around after closing
  }

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}/totp`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to generate 2FA credentials");
        return;
      }
      setResult(json.data as TotpResult);
      toast.success(totpEnabled ? "2FA regenerated" : "2FA enabled");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant={totpEnabled ? "secondary" : "outline"} size="sm" />}>
        {totpEnabled ? <ShieldCheck className="text-green-600" /> : <ShieldPlus />}
        {totpEnabled ? "Regenerate 2FA" : "Enable 2FA"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{totpEnabled ? "Regenerate 2FA" : "Enable 2FA"}</DialogTitle>
          <DialogDescription>
            {name}
            {email ? ` · ${email}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                {totpEnabled
                  ? "This invalidates the user's current authenticator and recovery codes. They'll need to re-scan the new QR code, and a 6-digit code will be required at every login."
                  : "This enrolls the user in two-factor auth. A 6-digit authenticator code will be required at every login. They cannot log in until they scan the QR code below."}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {totpEnabled ? "Regenerate" : "Enable"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Shown once. Copy these now — they won't be retrievable later.</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Image
                src={result.qrDataUrl}
                alt="Authenticator QR code"
                width={200}
                height={200}
                unoptimized
                className="rounded-lg border"
              />
              <p className="text-xs text-gray-500">Scan in Google Authenticator</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Manual key</p>
              <code className="block rounded bg-gray-100 px-2 py-1 text-xs break-all font-mono">
                {result.secret}
              </code>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Recovery codes (each usable once)
              </p>
              <div className="grid grid-cols-2 gap-1 rounded bg-gray-100 p-2 font-mono text-xs">
                {result.recoveryCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
