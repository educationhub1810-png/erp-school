import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "orange" | "purple" | "red" | "indigo";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
  red: "bg-red-50 text-red-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

export function StatCard({ title, value, subtitle, icon, trend, color = "indigo" }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="px-3 py-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-medium">{title}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400">{subtitle}</p>
            )}
            {trend && (
              <p className={cn("text-xs font-medium", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", colorMap[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
