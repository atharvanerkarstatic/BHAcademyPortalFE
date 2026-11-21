"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { DESKTOP_QUERY, useSidebarStore } from "@/stores/sidebar-store";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const closeMobile = useSidebarStore((state) => state.closeMobile);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMobile();
      }
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [closeMobile]);

  return children;
}

export function useSidebar() {
  const mobileOpen = useSidebarStore((state) => state.mobileOpen);
  const desktopCollapsed = useSidebarStore((state) => state.desktopCollapsed);
  const toggle = useSidebarStore((state) => state.toggle);
  const closeMobile = useSidebarStore((state) => state.closeMobile);

  return { mobileOpen, desktopCollapsed, toggle, closeMobile };
}
