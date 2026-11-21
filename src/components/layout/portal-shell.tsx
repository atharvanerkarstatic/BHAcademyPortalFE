"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import {
  getFirstAccessibleRoute,
  isRouteAllowed,
} from "@/lib/route-permissions";
import { cn } from "@/lib/utils";

import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";

function ShellBody({
  children,
  user,
}: {
  children: ReactNode;
  user: ReactNode;
}) {
  const { desktopCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser } = useAuth();

  // Instant route-level authorization check
  useEffect(() => {
    if (!authUser) {
      return;
    }

    const userPerms = [...authUser.roles, ...authUser.permissions];
    const firstAllowedRoute = getFirstAccessibleRoute(userPerms);

    // If user has no access to any application route, send to Access Denied page
    if (!firstAllowedRoute) {
      router.replace("/access-denied");
      return;
    }

    // Check if the current route is authorized for this user
    if (!isRouteAllowed(pathname, userPerms)) {
      router.replace(firstAllowedRoute);
    }
  }, [pathname, authUser, router]);

  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block" />
        }
      >
        <Sidebar user={user} />
      </Suspense>

      {/* Content shifts right only on desktop, when the sidebar is visible */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[padding] duration-300",
          desktopCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <Navbar user={user} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PortalShell({
  children,
  user,
}: {
  children: ReactNode;
  user: ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellBody user={user}>{children}</ShellBody>
    </SidebarProvider>
  );
}
