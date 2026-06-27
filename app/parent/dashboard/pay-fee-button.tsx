"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PayFeeButton() {
  return (
    <Button
      className="bg-pink-600 hover:bg-pink-700"
      onClick={() => toast.info("Online payments aren't enabled yet — please pay at the school office.")}
    >
      Pay Now
    </Button>
  );
}
