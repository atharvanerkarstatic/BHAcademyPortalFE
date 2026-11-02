"use client";

import { Suspense, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";

function ShellBody({ children, user }: { children: ReactNode; user: ReactNode }) {
  const { desktopCollapsed } = useSidebar();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block" />}>
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

export function PortalShell({ children, user }: { children: ReactNode; user: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellBody user={user}>{children}</ShellBody>
    </SidebarProvider>
  );
}