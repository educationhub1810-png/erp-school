import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  const title = "transport".replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 capitalize">transport</h1>
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center text-sm text-gray-400">
          {title} module coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
