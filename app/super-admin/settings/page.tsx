import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Database, Globe, Key, ShieldCheck } from "lucide-react";
import { getTwoFactorPolicies } from "@/lib/two-factor-policy";
import { Role2faToggles } from "./role-2fa-toggles";

export default async function SuperAdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const twoFactorPolicies = await getTwoFactorPolicies();

  const info = [
    { label: "Platform",      value: "iSMS v1.0",                icon: Globe   },
    { label: "Database",      value: "Neon PostgreSQL",           icon: Database },
    { label: "Auth",          value: "NextAuth v5",               icon: Key     },
    { label: "Framework",     value: "Next.js 16 (Turbopack)",    icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">System configuration and information</p>
      </div>

      {/* Account info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Administrator Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Name</p>
              <p className="font-medium text-gray-900">{session.user.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Login</p>
              <p className="font-medium text-gray-900">{session.user.email ?? "superadmin"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Role</p>
              <Badge className="bg-indigo-100 text-indigo-700">Super Admin</Badge>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Access</p>
              <Badge className="bg-green-100 text-green-700">Full Platform</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-factor policy */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Two-Factor Authentication
          </CardTitle>
          <p className="text-sm text-gray-500">
            Choose which roles must enter a 6-digit code emailed to them at login.
            Codes are sent via the configured mailbox — make sure email is set up first.
          </p>
        </CardHeader>
        <CardContent>
          <Role2faToggles policies={twoFactorPolicies} />
        </CardContent>
      </Card>

      {/* System info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {info.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environment */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className="bg-yellow-100 text-yellow-700">Development</Badge>
            <span className="text-sm text-gray-500">Running via ngrok tunnel</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
