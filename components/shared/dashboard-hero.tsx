import type { ReactNode } from "react";

interface Props {
  gradient: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
}

export function DashboardHero({ gradient, title, subtitle, icon }: Props) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r ${gradient} text-white p-6 shadow-sm flex items-center justify-between gap-4`}>
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          {title} <span aria-hidden>👋</span>
        </h1>
        <p className="text-white/80 text-sm mt-1">{subtitle}</p>
      </div>
      {icon && <div className="shrink-0 opacity-90">{icon}</div>}
    </div>
  );
}
