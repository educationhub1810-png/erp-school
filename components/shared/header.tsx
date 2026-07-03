"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_PROFILE_PATHS } from "@/lib/constants";
import type { AppRole as Role } from "@/lib/roles";

interface HeaderProps {
  user: {
    name: string;
    email?: string;
    role: Role;
  };
  school?: { name: string; logo: string | null } | null;
}

export function Header({ user, school }: HeaderProps) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const schoolInitials = school?.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
      {school ? (
        <div className="flex items-center gap-2.5 min-w-0">
          {school.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logo}
              alt={school.name}
              className="w-9 h-9 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{schoolInitials}</span>
            </div>
          )}
          <span className="text-base font-bold text-gray-900 truncate max-w-[260px]">
            {school.name}
          </span>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 min-w-[192px]" style={{ width: "192px" }}>
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              {user.email && (
                <p className="text-xs text-gray-500">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(ROLE_PROFILE_PATHS[user.role])}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
