"use client";

import { useState } from "react";
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
import { Eye, EyeOff, GraduationCap, Loader2, ChevronDown } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";

// Order roles are presented in the dropdown.
const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [keyof typeof ROLE_LABELS, string][];

const schema = z.object({
  role: z.string().min(1, "Please select your role"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  totp: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedRole = watch("role");
  const isStudent = selectedRole === "STUDENT";
  const isSuperAdmin = selectedRole === "SUPER_ADMIN";

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
        role: data.role,
        username: data.username,
        password: data.password,
        totp: data.totp ?? "",
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

              {/* Role dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <div className="relative">
                  <select
                    id="role"
                    {...register("role")}
                    defaultValue=""
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Select your role
                    </option>
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">
                  Username
                  {isStudent && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (student code)
                    </span>
                  )}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isStudent ? "Student code or email" : "Email or mobile"}
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
                  {isStudent && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (DOB as DDMMYYYY for students)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isStudent ? "e.g. 15082005" : "Enter your password"}
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

              {/* Authenticator (TOTP) code — Super Admin only. Required in
                  production; ignored on localhost (password-only there). */}
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label htmlFor="totp">
                    Authenticator code
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (6 digits, or a recovery code)
                    </span>
                  </Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    {...register("totp")}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support access — intentionally low-profile */}
        <div className="mt-4 text-center">
          {!adminCode && !adminError ? (
            <button
              onClick={() => setAdminCode(" ")}
              className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
            >
              Support
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <input
                type="password"
                value={adminCode.trim()}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
                placeholder="Access code"
                autoFocus
                className="w-36 h-7 rounded border border-gray-200 bg-white px-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <button
                onClick={handleAdminAccess}
                disabled={adminLoading || !adminCode.trim()}
                className="h-7 px-2.5 rounded border border-gray-200 text-gray-400 text-xs hover:text-gray-600 disabled:opacity-40"
              >
                {adminLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
              </button>
              {adminError && <span className="text-xs text-red-400">{adminError}</span>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} EduERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
