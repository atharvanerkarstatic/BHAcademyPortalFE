import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DESKTOP_QUERY = "(min-width: 1024px)";

interface SidebarStoreState {
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  openSections: Record<string, boolean>;
  toggle: () => void;
  closeMobile: () => void;
  toggleSection: (title: string) => void;
}

export const useSidebarStore = create<SidebarStoreState>()(
  persist(
    (set) => ({
      mobileOpen: false,
      desktopCollapsed: false,
      openSections: {},
      toggle: () => {
        if (
          typeof window !== "undefined" &&
          window.matchMedia(DESKTOP_QUERY).matches
        ) {
          set((state) => ({ desktopCollapsed: !state.desktopCollapsed }));
        } else {
          set((state) => ({ mobileOpen: !state.mobileOpen }));
        }
      },
      closeMobile: () => {
        set({ mobileOpen: false });
      },
      toggleSection: (title) => {
        set((state) => ({
          openSections: {
            ...state.openSections,
            [title]: !(state.openSections[title] ?? true),
          },
        }));
      },
    }),
    {
      name: "bh-portal-sidebar",
      partialize: (state) => ({
        desktopCollapsed: state.desktopCollapsed,
        openSections: state.openSections,
      }),
    }
  )
);
