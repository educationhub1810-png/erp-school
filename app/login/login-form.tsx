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
  BookOpen,
  PenLine,
  Star,
  Lightbulb,
  Sparkles,
  Award,
  Calendar,
  Bookmark,
  Compass,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { SchoolIllustration } from "./school-illustration";

// Temporarily not selectable from the login dropdown — accounts with these
// roles cannot sign in via this form while hidden here.
const HIDDEN_ROLES = new Set([
  "ACCOUNTANT",
  "LIBRARIAN",
  "TRANSPORT_MANAGER",
  "HR_MANAGER",
  "WARDEN_MANAGER",
  "MESS_MANAGER",
]);

// Order roles are presented in the dropdown.
const ROLE_OPTIONS = (Object.entries(ROLE_LABELS) as [keyof typeof ROLE_LABELS, string][]).filter(
  ([value]) => !HIDDEN_ROLES.has(value),
);

const FEATURES = [
  { icon: ShieldCheck, label: "Secure Platform", color: "bg-blue-500" },
  { icon: Users, label: "Multi Role Access", color: "bg-violet-500" },
  { icon: BarChart3, label: "Real-time Analytics", color: "bg-orange-500" },
  { icon: Cloud, label: "Cloud Based", color: "bg-green-500" },
];

// Small decorative icons that gently float in the page background.
const BG_ELEMENTS = [
  { icon: GraduationCap, className: "top-[8%] left-[6%] w-9 h-9 text-indigo-300/50 animate-float-1" },
  { icon: BookOpen, className: "top-[18%] right-[10%] w-8 h-8 text-blue-300/50 animate-float-2" },
  { icon: Star, className: "top-[60%] left-[4%] w-6 h-6 text-violet-300/50 animate-float-3" },
  { icon: PenLine, className: "bottom-[12%] right-[8%] w-7 h-7 text-indigo-300/50 animate-float-2" },
  { icon: Lightbulb, className: "bottom-[20%] left-[12%] w-7 h-7 text-amber-300/60 animate-float-1" },
  { icon: Sparkles, className: "top-[40%] right-[4%] w-6 h-6 text-violet-300/50 animate-float-3" },
  { icon: Award, className: "top-[6%] right-[26%] w-7 h-7 text-rose-300/55 animate-float-2" },
  { icon: Calendar, className: "bottom-[8%] left-[28%] w-6 h-6 text-blue-300/50 animate-float-3" },
  { icon: Bookmark, className: "top-[72%] right-[16%] w-6 h-6 text-indigo-300/50 animate-float-1" },
  { icon: Compass, className: "top-[32%] left-[20%] w-6 h-6 text-teal-300/50 animate-float-2" },
];

// Tiny twinkling sparkle dots scattered across the page for extra depth.
const BG_SPARKLES = [
  { className: "top-[14%] left-[18%] w-2 h-2 bg-amber-300 animate-twinkle-a" },
  { className: "top-[24%] right-[20%] w-1.5 h-1.5 bg-rose-300 animate-twinkle-b" },
  { className: "top-[50%] left-[9%] w-2 h-2 bg-indigo-300 animate-twinkle-c" },
  { className: "bottom-[30%] right-[10%] w-1.5 h-1.5 bg-blue-300 animate-twinkle-a" },
  { className: "bottom-[16%] left-[40%] w-2 h-2 bg-violet-300 animate-twinkle-b" },
  { className: "top-[8%] right-[40%] w-1.5 h-1.5 bg-teal-300 animate-twinkle-c" },
];

// Super Admin and School Admin log in with just a fresh authenticator code —
// the form never collects email/password for these roles (see auth.ts's
// code-only branch), so they're optional here and required only for
// everyone else; for these two roles the code itself becomes required.
const CODE_ONLY_ROLES = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

// These roles log in with their code (student/employee/parent code) as the
// username and their date of birth as the password — see auth.ts's matching
// lookup paths. They can also still log in with an email/mobile + their real
// password if they have one on file.
const DOB_PASSWORD_ROLES = new Set(["STUDENT", "PRINCIPAL", "TEACHER", "PARENT"]);

const schema = z
  .object({
    role: z.string().min(1, "Please select your role"),
    username: z.string().optional(),
    password: z.string().optional(),
    totp: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (CODE_ONLY_ROLES.has(data.role)) {
      if (!data.totp?.trim()) {
        ctx.addIssue({ code: "custom", message: "Authenticator code is required", path: ["totp"] });
      }
    } else {
      if (!data.username?.trim()) {
        ctx.addIssue({ code: "custom", message: "Username is required", path: ["username"] });
      }
      if (!data.password?.trim()) {
        ctx.addIssue({ code: "custom", message: "Password is required", path: ["password"] });
      }
    }
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
  const usesDobPassword = DOB_PASSWORD_ROLES.has(selectedRole);
  // Super Admin / School Admin: code-only login. Email/mobile + password are
  // hidden entirely and only the authenticator code is collected.
  const isCodeOnly = selectedRole === "SUPER_ADMIN" || selectedRole === "SCHOOL_ADMIN";
  // Label/placeholder follow the selected role (e.g. "Teacher Code").
  const usernameLabel = selectedRole
    ? `${ROLE_LABELS[selectedRole as keyof typeof ROLE_LABELS]} Code`
    : "User Code";

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
      const result = await signIn(
        "credentials",
        CODE_ONLY_ROLES.has(data.role)
          ? { role: data.role, totp: data.totp ?? "", redirect: false }
          : { role: data.role, username: data.username, password: data.password, totp: data.totp ?? "", redirect: false },
      );

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-6">
      {/* Ambient drifting background blobs — a "living" backdrop with no video/gif asset to load */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob-1 absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-indigo-300/40 blur-3xl" />
        <div className="animate-blob-2 absolute top-1/3 -right-24 w-[32rem] h-[32rem] rounded-full bg-blue-300/35 blur-3xl" />
        <div className="animate-blob-3 absolute -bottom-28 left-1/3 w-[26rem] h-[26rem] rounded-full bg-violet-300/30 blur-3xl" />
        <div className="animate-blob-2 absolute top-10 left-1/4 w-72 h-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="animate-blob-1 absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-amber-200/25 blur-3xl" />

        {/* soft spotlight behind the card for extra depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgba(255,255,255,0.55),transparent)]" />

        {/* floating education-themed icons */}
        {BG_ELEMENTS.map(({ icon: Icon, className }, i) => (
          <Icon key={i} className={`absolute ${className}`} />
        ))}

        {/* twinkling sparkle dots */}
        {BG_SPARKLES.map(({ className }, i) => (
          <span key={i} className={`absolute rounded-full ${className}`} />
        ))}
      </div>

      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl shadow-2xl overflow-hidden bg-white ring-1 ring-black/5">
        {/* Left: branded hero panel — hidden below lg, form-only on smaller screens */}
        <div className="hidden lg:flex flex-col w-[44%] shrink-0 relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-8 text-white overflow-hidden">
          {/* decorative glow blobs */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/15 ring-1 ring-white/30 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">EduERP</h1>
              <p className="text-xs text-indigo-200">Smart School Management System</p>
            </div>
          </div>

          <div className="relative">
            <h2 className="text-2xl font-bold mb-1">Welcome Back! 👋</h2>
            <p className="text-sm text-indigo-200">Sign in to continue to your account</p>
          </div>

          <div className="relative flex-1 flex items-center justify-center min-h-0 py-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-h-[260px] flex items-center justify-center">
              <SchoolIllustration />
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${f.color}`}>
                  <f.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-medium leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sign-in form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10">
          {/* Compact logo shown only when the hero panel is hidden (mobile/tablet) */}
          <div className="lg:hidden flex flex-col items-center mb-5">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">EduERP</h1>
            <p className="text-xs text-gray-500 mt-1">Smart School Management System</p>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div className="hidden lg:flex w-8 h-8 rounded-full bg-indigo-50 items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Welcome Back! 👋</h2>
                <p className="text-sm text-gray-500">Sign in to continue to your account</p>
              </div>
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

              {/* Email/mobile + password — hidden entirely for Super Admin /
                  School Admin, who log in with just a fresh authenticator
                  code instead (see the Authenticator code field below). */}
              {!isCodeOnly && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">{usernameLabel}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="username"
                        type="text"
                        placeholder={`Enter ${usernameLabel.toLowerCase()}`}
                        {...register("username")}
                        autoComplete="username"
                        className="pl-10"
                      />
                    </div>
                    {errors.username && (
                      <p className="text-xs text-red-500">{errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">
                      Password
                      {usesDobPassword && (
                        <span className="text-gray-400 font-normal text-xs ml-1">
                          (DOB as DDMMYYYY, or your real password)
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={usesDobPassword ? "e.g. 15082005" : "Enter your password"}
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
                </>
              )}

              {/* Authenticator code — the sole credential for Super Admin /
                  School Admin (see above); other roles never see this field. */}
              {isCodeOnly && (
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
                      autoFocus
                      {...register("totp")}
                      className="pl-10"
                    />
                  </div>
                  {errors.totp && <p className="text-xs text-red-500">{errors.totp.message}</p>}
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

            {/* Support access — intentionally low-profile */}
            <div className="mt-3 text-center">
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

            <p className="text-center text-xs text-gray-400 mt-3">
              © {new Date().getFullYear()} EduERP. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
