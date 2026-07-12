"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GraduationCap, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_CONFIG } from "@/lib/nav-config";
import type { AppRole } from "@/lib/roles";

const STORAGE_KEY = "sidebar-collapsed";

interface SidebarProps {
  role: AppRole;
  /** Whether the off-canvas mobile drawer is open (ignored at md: and above, where the sidebar is always inline). */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close (backdrop click, close button, or navigating). */
  onMobileClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onMobileClose }: SidebarProps) {
  const navItems = NAV_CONFIG[role] ?? [];
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  // Auto-close the mobile drawer whenever the route changes.
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  if (!mounted) return <aside className="hidden md:block w-16 bg-[#f7f8fa] border-r border-gray-200 min-h-screen" />;

  // Inside the mobile drawer, always show full labels (it's an intentional
  // overlay, not the constrained desktop rail) regardless of the persisted
  // desktop collapse preference.
  const showLabels = !collapsed || mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-[#f7f8fa] text-gray-900 border-r border-gray-200 transition-all duration-200 shrink-0",
          "fixed inset-y-0 left-0 z-50 w-64 md:static md:z-auto md:min-h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Logo + toggle */}
        <div className={cn(
          "flex items-center border-b border-gray-200 py-4",
          showLabels ? "flex-row justify-between px-3" : "flex-col gap-3 px-0 justify-center"
        )}>
          <div className="flex items-center gap-2.5">
            {!showLabels ? (
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/isms-logo-blue.png" alt="iSMS" className="h-6 w-auto" />
                <p className="text-[10px] text-gray-500 capitalize truncate mt-1">
                  {role.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={toggle}
            className="hidden md:block p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
          <button
            onClick={onMobileClose}
            className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors shrink-0"
            title="Close menu"
          >
            <X className="w-4 h-4" />
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
                title={!showLabels ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {showLabels && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Last updated (build time) */}
        {lastUpdated && (
          <div className="border-t border-gray-200 px-3 py-2.5">
            {!showLabels ? (
              <p className="text-center text-[9px] leading-tight text-gray-400" title={`Last updated ${lastUpdated}`}>
                upd.
              </p>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Last updated</p>
                <p className="text-[11px] text-gray-500">{lastUpdated}</p>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
