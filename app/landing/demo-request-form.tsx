"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  schoolName: z.string().trim().min(1, "School/institution name is required"),
  message: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function DemoRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch("/api/public/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-10">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <h3 className="text-lg font-bold text-gray-900">Thanks — request received!</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Our team will reach out shortly to schedule your demo.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="demo-name">Full Name</Label>
          <Input id="demo-name" placeholder="Your name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-email">Email</Label>
          <Input id="demo-email" type="email" placeholder="you@school.edu" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="demo-phone">Phone</Label>
          <Input id="demo-phone" type="tel" placeholder="Contact number" {...register("phone")} />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-school">School / Institution Name</Label>
          <Input id="demo-school" placeholder="Your school's name" {...register("schoolName")} />
          {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-message">
          Message <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="demo-message"
          placeholder="Tell us about your school and what you're looking for"
          rows={3}
          {...register("message")}
        />
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Request a Demo
      </Button>
    </form>
  );
}
