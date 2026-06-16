"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  id: string;
  isActive: boolean;
  name: string;
}

export function SchoolToggle({ id, isActive, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/schools/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      toast.success(`${name} ${!isActive ? "enabled" : "disabled"}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`
        flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors
        ${isActive
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-green-200 text-green-600 hover:bg-green-50"
        }
      `}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {isActive ? "Disable" : "Enable"}
    </button>
  );
}
