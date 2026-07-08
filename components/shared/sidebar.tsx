"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GraduationCap, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_CONFIG } from "@/lib/nav-config";
import type { AppRole } from "@/lib/roles";

const STORAGE_KEY = "sidebar-collapsed";

interface SidebarProps {
  role: AppRole;
}

export function Sidebar({ role }: SidebarProps) {
  const navItems = NAV_CONFIG[role] ?? [];
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, String(!c));
      return !c;
    });
  };

  // Build/deploy time stamped at build (see next.config.ts).
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const lastUpdated = buildTime
    ? new Date(buildTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (!mounted) return <aside className="w-16 bg-gray-900 min-h-screen" />;

  return (
    <aside
      className={cn(
        "flex flex-col bg-gray-900 text-white transition-all duration-200 min-h-screen shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        "flex items-center border-b border-gray-700/60 py-4",
        collapsed ? "flex-col gap-3 px-0 justify-center" : "flex-row justify-between px-3"
      )}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white leading-tight">EduERP</p>
              <p className="text-[10px] text-gray-400 capitalize truncate">
                {role.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Last updated (build time) */}
      {lastUpdated && (
        <div className="border-t border-gray-700/60 px-3 py-2.5">
          {collapsed ? (
            <p className="text-center text-[9px] leading-tight text-gray-500" title={`Last updated ${lastUpdated}`}>
              upd.
            </p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Last updated</p>
              <p className="text-[11px] text-gray-400">{lastUpdated}</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
