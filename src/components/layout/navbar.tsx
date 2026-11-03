"use client";

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, Menu, Pencil, UserRound } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/action";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "./sidebar-context";

export function Navbar({ user }: { user: ReactNode }) {
  const router = useRouter();
  const { toggle } = useSidebar();
  const { profile } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction(); 
    });
  };

  // Determine display name and avatar from profile, fallback to user (email)
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const displayName = fullName || profile?.email || user;
  const avatarUrl = profile?.profilePic;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b bg-white px-4">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle sidebar" suppressHydrationWarning>
        <Menu className="h-5 w-5" />
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          suppressHydrationWarning
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={String(displayName || "Profile")}
                fill
                sizes="32px"
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
          </span>
          <span className="hidden max-w-[200px] truncate font-semibold text-slate-800 sm:block">
            {displayName}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          {/* Card header */}
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={String(displayName || "Profile")}
                  fill
                  sizes="40px"
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer gap-2">
            <Pencil className="h-4 w-4" /> Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/change-password")}
            className="cursor-pointer gap-2"
          >
            <KeyRound className="h-4 w-4" /> Change Password
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of the portal?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault(); 
                handleLogout();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isPending ? "Logging out…" : "Log Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
