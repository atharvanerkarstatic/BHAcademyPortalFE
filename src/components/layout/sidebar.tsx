"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navSections, type NavSection } from "./nav-items";
import { useSidebar } from "./sidebar-context";

function CollapsibleNavSection({
  section,
  pathname,
  closeMobile,
  can,
  desktopCollapsed,
}: {
  section: NavSection;
  pathname: string;
  closeMobile: () => void;
  can: (perm: string | string[]) => boolean;
  desktopCollapsed: boolean;
}) {
  const visibleItems = section.items.filter((item) =>
    item.permission ? can(item.permission) : true
  );

  const isAnyChildActive = visibleItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const [isOpen, setIsOpen] = useState(true);

  if (visibleItems.length === 0) return null;

  const Icon = section.icon;

  return (
    <div className="mt-2 border-t pt-2">
      {/* Expanded Accordion (Used on mobile and on desktop when expanded) */}
      <div className={cn(desktopCollapsed && "lg:hidden")}>
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 text-slate-700" />}
            <span>{section.title}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-600 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>

        {isOpen && (
          <ul className="mt-1 space-y-0.5 pl-2">
            {visibleItems.map(({ label, href, icon: ItemIcon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <ItemIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Collapsed Icon + Flyout Menu (Shown on desktop when collapsed) */}
      {desktopCollapsed && (
        <div className="hidden lg:block">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              title={section.title}
              suppressHydrationWarning
              className={cn(
                "flex h-10 w-10 mx-auto items-center justify-center rounded-md outline-none transition-colors",
                isAnyChildActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {Icon ? <Icon className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-4 w-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-56 p-1.5 shadow-lg">
              <div className="px-2.5 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
              <DropdownMenuSeparator />
              {visibleItems.map(({ label, href, icon: ItemIcon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <DropdownMenuItem key={href} asChild>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium cursor-pointer transition-colors",
                        active
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0 text-slate-500" />
                      <span>{label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user }: { user: ReactNode }) {
  const pathname = usePathname();
  const { mobileOpen, desktopCollapsed, closeMobile } = useSidebar();
  const { can, profile } = useAuth();

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const displayName = fullName || profile?.email || user;
  const avatarUrl = profile?.profilePic;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={closeMobile}
          aria-hidden
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-white shadow-xl transition-all duration-300 ease-in-out lg:shadow-none",
          // Mobile drawer controls
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop controls: always visible, switches between w-16 and w-64
          "lg:translate-x-0",
          desktopCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b transition-all duration-300",
            desktopCollapsed ? "lg:justify-center lg:px-2 px-4 gap-3" : "px-4 gap-3"
          )}
        >
          <Image
            src="/logo.png"
            alt="AP Colour Academy"
            width={40}
            height={40}
            className="h-10 w-auto shrink-0"
          />
          <span
            className={cn(
              "text-lg font-semibold tracking-tight text-slate-900",
              desktopCollapsed ? "lg:hidden" : "block"
            )}
          >
            AP Colour Academy
          </span>
        </div>

        {/* Logged-in user - clickable to navigate directly to Edit Profile */}
        <Link
          href="/profile"
          onClick={closeMobile}
          title="Edit Profile"
          className={cn(
            "group flex shrink-0 items-center border-b transition-all duration-300 hover:bg-slate-50",
            desktopCollapsed ? "lg:justify-center lg:py-3 lg:px-2 px-4 py-4 gap-3" : "px-4 py-4 gap-3"
          )}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 ring-2 ring-transparent transition-all group-hover:ring-blue-400">
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
              <UserRound className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
            )}
          </span>
          <span
            className={cn(
              "truncate text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors",
              desktopCollapsed ? "lg:hidden" : "block"
            )}
          >
            {displayName}
          </span>
        </Link>

        {/* Links (scrolls if the screen is short) */}
        <nav className={cn("flex-1 overflow-y-auto py-3", desktopCollapsed ? "lg:px-1.5 px-3" : "px-3")}>
          {navSections.map((section, i) => {
            if (section.collapsible) {
              return (
                <CollapsibleNavSection
                  key={section.title || `collapsible-${i}`}
                  section={section}
                  pathname={pathname}
                  closeMobile={closeMobile}
                  can={can}
                  desktopCollapsed={desktopCollapsed}
                />
              );
            }

            // Filter section items according to user permissions
            const visibleItems = section.items.filter((item) =>
              item.permission ? can(item.permission) : true
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || `section-${i}`} className={cn(i > 0 && "mt-2 border-t pt-2")}>
                {section.title && (
                  <p
                    className={cn(
                      "px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400",
                      desktopCollapsed ? "lg:hidden" : "block"
                    )}
                  >
                    {section.title}
                  </p>
                )}
                <ul className="space-y-1">
                  {visibleItems.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={closeMobile}
                          title={desktopCollapsed ? label : undefined}
                          className={cn(
                            "flex items-center rounded-md text-sm font-medium transition-colors",
                            desktopCollapsed
                              ? "lg:h-10 lg:w-10 lg:justify-center lg:px-0 lg:mx-auto px-3 py-2 gap-3"
                              : "gap-3 px-3 py-2",
                            active
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span
                            className={cn(
                              desktopCollapsed ? "lg:hidden" : "block",
                              "truncate"
                            )}
                          >
                            {label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
