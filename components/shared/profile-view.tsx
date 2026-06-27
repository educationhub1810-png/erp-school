import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Calendar, School, IdCard, type LucideIcon } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { ProfileData } from "@/lib/profile";

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export function ProfileView({ data }: { data: ProfileData }) {
  const initials = data.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your account details</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="w-16 h-16">
              {data.photoUrl && <AvatarImage src={data.photoUrl} alt={data.name} />}
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-gray-900">{data.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-indigo-100 text-indigo-700">{ROLE_LABELS[data.role]}</Badge>
                <Badge className={data.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                  {data.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact & Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field icon={Mail} label="Email" value={data.email ?? "—"} />
            <Field icon={Phone} label="Mobile" value={data.mobile ?? "—"} />
            <Field
              icon={School}
              label="School"
              value={data.schoolName ? `${data.schoolName} (${data.schoolCode})` : "—"}
            />
            <Field icon={Calendar} label="Member Since" value={new Date(data.createdAt).toLocaleDateString("en-IN")} />
          </div>
        </CardContent>
      </Card>

      {data.details.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IdCard className="w-4 h-4" /> Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {data.details.map((d) => (
                <div key={d.label}>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{d.label}</p>
                  <p className="font-medium text-gray-900">{d.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
