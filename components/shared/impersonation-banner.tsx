"use client";

import { signOut } from "next-auth/react";
import { ShieldCheck, X } from "lucide-react";

interface Props {
  userName: string;
  userRole: string;
}

export function ImpersonationBanner({ userName, userRole }: Props) {
  const exit = async () => {
    await signOut({ redirect: false });
    window.location.href = "/admin-access";
  };

  return (
    <div className="w-full bg-orange-500 text-white text-xs flex items-center justify-between px-4 py-1.5 gap-2">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>
          Admin Mode — signed in as <strong>{userName}</strong> ({userRole})
        </span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 rounded px-2 py-0.5 transition-colors shrink-0"
      >
        <X className="w-3 h-3" /> Exit
      </button>
    </div>
  );
}
