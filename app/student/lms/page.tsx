import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, BookOpen, FileText } from "lucide-react";

export default async function StudentLMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning Management</h1>
        <p className="text-sm text-gray-500 mt-1">Study materials and video lessons</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { icon: Video,    label: "Video Lessons",   count: 0, color: "bg-purple-50 text-purple-600" },
          { icon: FileText, label: "Study Materials",  count: 0, color: "bg-blue-50 text-blue-600"   },
          { icon: BookOpen, label: "Practice Tests",   count: 0, color: "bg-green-50 text-green-600"  },
        ].map(({ icon: Icon, label, count, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No content available yet.</p>
            <p className="text-xs text-gray-300 mt-1">Your teachers will upload lessons and materials here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
