"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import type { RoleTwoFactorPolicy } from "@/lib/two-factor-policy";

interface Props {
  policies: RoleTwoFactorPolicy[];
}

// Super Admin control for which roles must enter an emailed code at login.
// Each row is a switch that PUTs to /api/v1/settings/two-factor. Super Admin's
// own row is locked on.
export function Role2faToggles({ policies }: Props) {
  const [state, setState] = useState(policies);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const toggle = async (role: string, next: boolean) => {
    setSavingRole(role);
    // Optimistic flip; revert on failure.
    setState((s) => s.map((p) => (p.role === role ? { ...p, required: next } : p)));
    try {
      const res = await fetch("/api/v1/settings/two-factor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, required: next }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error || "Failed to update");
        setState((s) => s.map((p) => (p.role === role ? { ...p, required: !next } : p)));
        return;
      }
      const label = state.find((p) => p.role === role)?.label ?? role;
      toast.success(`Two-factor ${next ? "enabled" : "disabled"} for ${label}`);
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {state.map((p) => (
        <div key={p.role} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{p.label}</span>
            {p.locked && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Lock className="w-3 h-3" /> always on
              </span>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={p.required}
            aria-label={`Require two-factor for ${p.label}`}
            disabled={p.locked || savingRole === p.role}
            onClick={() => toggle(p.role, !p.required)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              p.required ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                p.required ? "translate-x-5" : "translate-x-0.5"
              }`}
            >
              {savingRole === p.role && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
