"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, GraduationCap, Loader2, ChevronDown, ShieldCheck } from "lucide-react";

interface School {
  id: string;
  name: string;
  code: string;
}

const schema = z.object({
  schoolCode: z.string().optional(),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/schools", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSchools(d.data ?? []))
      .catch(() => setSchools([]))
      .finally(() => setSchoolsLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedSchoolCode = watch("schoolCode");
  const isStudentSchool = !!selectedSchoolCode && selectedSchoolCode !== "";

  const handleAdminAccess = async () => {
    setAdminError(null);
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode }),
      });
      if (!res.ok) {
        setAdminError("Invalid code. Try again.");
        return;
      }
      window.location.href = "/admin-access";
    } finally {
      setAdminLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        schoolCode: data.schoolCode ?? "",
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setError("Invalid credentials. Please check your details.");
      } else {
        window.location.href = callbackUrl;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduERP</h1>
          <p className="text-sm text-gray-500 mt-1">School Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* School dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="schoolCode">School</Label>
                <div className="relative">
                  <select
                    id="schoolCode"
                    {...register("schoolCode")}
                    disabled={schoolsLoading}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">
                      {schoolsLoading ? "Loading schools…" : "Super Admin (no school)"}
                    </option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name} — {s.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">
                  Username
                  {isStudentSchool && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (admission no. for students)
                    </span>
                  )}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isStudentSchool ? "Admission number or email" : "Email or mobile"}
                  {...register("username")}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password
                  {isStudentSchool && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (DOB as DDMMYYYY for students)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isStudentSchool ? "e.g. 15082005" : "Enter your password"}
                    {...register("password")}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || schoolsLoading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Administrative Access */}
        <div className="mt-6 border border-orange-200 rounded-xl p-4 bg-orange-50/60">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Administrative Access
            </span>
          </div>
          {adminError && (
            <p className="text-xs text-red-500 mb-2">{adminError}</p>
          )}
          <div className="flex gap-2">
            <input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
              placeholder="Enter secret code"
              className="flex-1 h-8 rounded-md border border-orange-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              onClick={handleAdminAccess}
              disabled={adminLoading || !adminCode}
              className="h-8 px-3 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1"
            >
              {adminLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enter →"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} EduERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
