"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";

// Map client paths to permission requirements for instant active-page authorization
const ROUTE_PERMISSIONS: { pattern: RegExp; permission: string | string[] }[] = [
  { pattern: /^\/faqs\/new(\/.*)?$/, permission: "faqs.create" },
  { pattern: /^\/faqs\/[^/]+\/edit(\/.*)?$/, permission: "faqs.update" },
  { pattern: /^\/faqs(\/.*)?$/, permission: "faqs.read" },
  { pattern: /^\/categories\/new(\/.*)?$/, permission: "categories.create" },
  { pattern: /^\/categories\/[^/]+\/edit(\/.*)?$/, permission: "categories.update" },
  { pattern: /^\/categories(\/.*)?$/, permission: "categories.read" },
  { pattern: /^\/courses(\/.*)?$/, permission: "courses.read" },
  { pattern: /^\/users(\/.*)?$/, permission: "users.read" },
  { pattern: /^\/accounts(\/.*)?$/, permission: ["accounts.read", "users.read"] },
  { pattern: /^\/trainers(\/.*)?$/, permission: ["users.read", "ROLE_TRAINER"] },
  { pattern: /^\/assessments\/send(\/.*)?$/, permission: ["assessments.create", "courses.read"] },
  { pattern: /^\/assessments\/links(\/.*)?$/, permission: ["assessments.read", "courses.read"] },
  { pattern: /^\/assessments\/results(\/.*)?$/, permission: ["assessments.read", "audit.read"] },
  { pattern: /^\/reports(\/.*)?$/, permission: ["reports.read", "audit.read"] },
  { pattern: /^\/roles(\/.*)?$/, permission: "roles.read" },
  { pattern: /^\/admin-users(\/.*)?$/, permission: "users.read" },
  { pattern: /^\/cities(\/.*)?$/, permission: ["pincode.read", "system.all"] },
  { pattern: /^\/report-scheduler(\/.*)?$/, permission: "system.all" },
  { pattern: /^\/dashboard(\/.*)?$/, permission: "dashboard.read" },
];

function ShellBody({ children, user }: { children: ReactNode; user: ReactNode }) {
  const { desktopCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { can, user: authUser } = useAuth();

  // Instant route-level redirect to Dashboard when current route permission is revoked
  useEffect(() => {
    if (!authUser || pathname === "/dashboard") return;

    for (const rule of ROUTE_PERMISSIONS) {
      if (rule.pattern.test(pathname)) {
        if (!can(rule.permission)) {
          router.replace("/dashboard");
          break;
        }
      }
    }
  }, [pathname, can, authUser, router]);

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