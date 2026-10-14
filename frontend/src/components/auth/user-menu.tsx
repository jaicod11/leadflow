"use client";

import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/user-initials";

/** Avatar button with the signed-in user's name and email, and "Log out". */
export function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 transition-colors outline-none hover:bg-blue-200 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-blue-200"
      >
        <span aria-hidden>{getInitials(user?.name ?? "")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-auto max-w-[calc(100vw-2rem)] min-w-56"
      >
        {user && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5 font-normal">
              <span className="truncate text-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
