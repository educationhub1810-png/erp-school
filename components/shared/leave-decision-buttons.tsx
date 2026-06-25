"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LeaveDecisionButtons({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  const decide = async (status: "APPROVED" | "REJECTED") => {
    setLoading(status);
    try {
      const res = await fetch(`/api/v1/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update leave request");
        return;
      }
      toast.success(status === "APPROVED" ? "Leave approved" : "Leave rejected");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
        disabled={loading !== null}
        onClick={() => decide("APPROVED")}
      >
        {loading === "APPROVED" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        disabled={loading !== null}
        onClick={() => decide("REJECTED")}
      >
        {loading === "REJECTED" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}
        Reject
      </Button>
    </div>
  );
}
