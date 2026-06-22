"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { BUG_PRIORITY_LABELS, BUG_PRIORITIES, BUG_SCREENSHOT_MAX_BYTES } from "@/lib/bug-config";
import type { BugTicketView } from "./types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().min(1, "Description is required"),
  whatNotWorking: z.string().min(1, "Please describe what is not working"),
  whatExpected: z.string().min(1, "Please describe what you expected"),
  screenshotUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onCreated: (ticket: BugTicketView) => void;
}

export function CreateBugDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const screenshotUrl = watch("screenshotUrl");

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > BUG_SCREENSHOT_MAX_BYTES) {
      toast.error("Screenshot is too large. Maximum size is 2 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue("screenshotUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to report bug");
        return;
      }
      toast.success("Bug reported");
      onCreated(json.data as BugTicketView);
      reset();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v, eventDetails) => {
        if (!v && eventDetails.reason !== "close-press") return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Bug className="w-4 h-4 mr-2" /> Report a Bug
      </DialogTrigger>

      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Title *</Label>
              <Input placeholder="Short summary of the issue" {...register("title")} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v as FormValues["priority"])}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUG_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{BUG_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea rows={2} placeholder="Briefly describe the bug" {...register("description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>What is not working? *</Label>
            <Textarea rows={2} placeholder="Describe the current (incorrect) behavior" {...register("whatNotWorking")} />
            {errors.whatNotWorking && <p className="text-xs text-red-500">{errors.whatNotWorking.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>What is expected? *</Label>
            <Textarea rows={2} placeholder="Describe what should happen instead" {...register("whatExpected")} />
            {errors.whatExpected && <p className="text-xs text-red-500">{errors.whatExpected.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Screenshot</Label>
            {screenshotUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshotUrl} alt="Screenshot preview" className="h-28 rounded-md border object-contain bg-gray-50" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setValue("screenshotUrl", "")}>
                  <X className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div>
                <Button variant="outline" nativeButton={false} render={<label className="cursor-pointer" />}>
                  <Upload className="w-4 h-4 mr-1.5" /> Upload Screenshot
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                </Button>
                <p className="text-xs text-gray-400 mt-1">Optional. PNG/JPG up to 2 MB.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
