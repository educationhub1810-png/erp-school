"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  name: string;
}

type Mode = "set" | "generate";

// Super-Admin-only row action: reset a user's login password, either by typing
// a new one or generating a strong random one. On success the resulting
// password is shown once with a copy button. Calls
// POST /api/v1/users/:id/reset-password.
export function ResetPasswordAction({ userId, name }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("generate");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("generate");
    setPassword("");
    setShow(false);
    setResult(null);
    setCopied(false);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async () => {
    setError(null);
    if (mode === "set" && password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "set" ? { mode, password } : { mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error || "Failed to reset password");
        return;
      }
      setResult((json as { data: { password: string } }).data.password);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Password copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 px-1.5 py-1 rounded transition-colors"
        title="Reset password"
      >
        <KeyRound className="w-3.5 h-3.5" />
      </button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "Password Reset" : `Reset password — ${name}`}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Password for <span className="font-medium">{name}</span> has been reset. Share it now —
                it won&apos;t be shown again.
              </AlertDescription>
            </Alert>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">New Password</p>
                <p className="font-mono font-semibold text-gray-900">{result}</p>
              </div>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={close} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("generate")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "generate"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Generate random
              </button>
              <button
                type="button"
                onClick={() => setMode("set")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "set"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Set manually
              </button>
            </div>

            {mode === "set" ? (
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                A strong random password will be generated and shown once so you can share it with the user.
              </p>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
