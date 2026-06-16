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
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
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
    </aside>
  );
}
