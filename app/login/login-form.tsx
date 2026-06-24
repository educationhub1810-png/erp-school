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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  ChevronDown,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Users,
  BarChart3,
  Cloud,
  KeyRound,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { SchoolIllustration } from "./school-illustration";

// Order roles are presented in the dropdown.
const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [keyof typeof ROLE_LABELS, string][];

const FEATURES = [
  { icon: ShieldCheck, label: "Secure Platform", color: "bg-blue-500" },
  { icon: Users, label: "Multi Role Access", color: "bg-violet-500" },
  { icon: BarChart3, label: "Real-time Analytics", color: "bg-orange-500" },
  { icon: Cloud, label: "Cloud Based", color: "bg-green-500" },
];

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
  const [adminTotp, setAdminTotp] = useState("");
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
        body: JSON.stringify({ code: adminCode.trim(), totp: adminTotp.trim() }),
      });
      if (!res.ok) {
        setAdminError("Invalid code or authenticator. Try again.");
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
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-3 xl:p-4">
      <div className="w-full max-w-5xl h-full max-h-[calc(100vh-1.5rem)] flex flex-col xl:flex-row items-center justify-center gap-4 xl:gap-6 overflow-hidden">
        {/* Left: branding + illustration — hidden below xl; sized with margin to spare so the two-column layout never needs more width than the viewport actually has */}
        <div className="hidden xl:flex flex-col w-full max-w-lg h-full max-h-full shrink-0 justify-center min-h-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-indigo-700 leading-tight">EduERP</h1>
              <p className="text-xs text-gray-500">Smart School Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back! 👋</h2>
          <p className="text-sm text-gray-500 mb-3">Sign in to continue to your account</p>

          <div className="min-h-0 flex-1 flex items-center justify-center max-h-[42vh] overflow-hidden">
            <SchoolIllustration />
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3 shrink-0">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/70 backdrop-blur-sm shadow-sm px-2 py-2 text-center"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${f.color}`}>
                  <f.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-gray-700 leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sign-in form */}
        <div className="w-full max-w-sm mx-auto max-h-full overflow-y-auto">
          {/* Compact logo shown only when the illustration panel is hidden (mobile/tablet/laptop) */}
          <div className="xl:hidden flex flex-col items-center mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">EduERP</h1>
            <p className="text-xs text-gray-500 mt-1">Smart School Management System</p>
          </div>

          <div className="relative bg-white rounded-3xl shadow-xl p-5 sm:p-6">
            <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="mb-4 hidden xl:block">
              <h2 className="text-lg font-bold text-gray-900">Welcome Back! 👋</h2>
              <p className="text-sm text-gray-500 mt-1">Sign in to continue to your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="role">Select Your Role</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    id="role"
                    {...register("role")}
                    defaultValue=""
                    className="w-full h-9 rounded-md border border-input bg-background pl-10 pr-8 py-1 text-sm shadow-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Choose your role
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
                  Email or Mobile Number
                  {isStudent && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      (student code)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={isStudent ? "Student code or email" : "Enter email or mobile number"}
                    {...register("username")}
                    autoComplete="username"
                    className="pl-10"
                  />
                </div>
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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isStudent ? "e.g. 15082005" : "Enter your password"}
                    {...register("password")}
                    autoComplete="current-password"
                    className="pl-10 pr-10"
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
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      {...register("totp")}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Login to Dashboard
              </Button>
            </form>
          </div>

          {/* Support access — intentionally low-profile */}
          <div className="mt-2 text-center">
            {!adminCode && !adminError ? (
              <button
                onClick={() => setAdminCode(" ")}
                className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
              >
                Support
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <input
                  type="password"
                  value={adminCode.trim()}
                  onChange={(e) => setAdminCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
                  placeholder="Access code"
                  autoFocus
                  className="w-44 h-7 rounded border border-gray-200 bg-white px-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={adminTotp}
                  onChange={(e) => setAdminTotp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
                  placeholder="Authenticator code"
                  className="w-44 h-7 rounded border border-gray-200 bg-white px-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAdminAccess}
                    disabled={adminLoading || !adminCode.trim()}
                    className="h-7 px-3 rounded border border-gray-200 text-gray-400 text-xs hover:text-gray-600 disabled:opacity-40"
                  >
                    {adminLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
                  </button>
                  {adminError && <span className="text-xs text-red-400">{adminError}</span>}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-2">
            © {new Date().getFullYear()} EduERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
