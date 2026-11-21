"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { UserProfile } from "@/features/profile/action";
import { AUTH_PERMS_COOKIE, AUTH_UPDATED_COOKIE } from "@/lib/auth-cookies";
import { hasPermission } from "@/lib/auth-jwt";
import type { AuthUser } from "@/lib/auth-jwt";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { asString, isRecord } from "@/lib/type-guards";
import { useToastStore } from "@/stores/toast-store";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  permissions: Array<string>;
  roles: Array<string>;
  can: (permissionOrRole: string | Array<string>) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  refreshProfile: () => Promise<void>;
  syncAuthFromCookies: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readUserFromCookie(): AuthUser | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_PERMS_COOKIE}=`));

  if (!match) {
    return null;
  }

  try {
    const raw = decodeURIComponent(match.slice(AUTH_PERMS_COOKIE.length + 1));
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    const authList =
      "auth" in parsed && Array.isArray(parsed.auth)
        ? parsed.auth.filter((item): item is string => typeof item === "string")
        : [];

    return {
      id: "id" in parsed ? asString(parsed.id) : undefined,
      email: ("email" in parsed ? asString(parsed.email) : undefined) ?? "",
      permissions: authList.filter((item) => !item.startsWith("ROLE_")),
      roles: authList.filter((item) => item.startsWith("ROLE_")),
    };
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(
    () => initialUser ?? readUserFromCookie()
  );

  const { data: profile = null } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) =>
      portalGet<UserProfile>("profile", undefined, signal),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Synchronize user state immediately from user_perms cookie
  const syncAuthFromCookies = useCallback(() => {
    const freshUser = readUserFromCookie();
    if (!freshUser) {
      return;
    }

    setUser((prev) => {
      const prevPerms = prev
        ? [...prev.roles, ...prev.permissions].toSorted().join(",")
        : "";
      const freshPerms = [...freshUser.roles, ...freshUser.permissions]
        .toSorted()
        .join(",");
      if (
        prev?.id === freshUser.id &&
        prev?.email === freshUser.email &&
        prevPerms === freshPerms
      ) {
        return prev;
      }
      return freshUser;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  }, [queryClient]);

  const syncAndNotify = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const hasUpdatedFlag = document.cookie
      .split("; ")
      .some((row) => row.startsWith(`${AUTH_UPDATED_COOKIE}=`));

    if (hasUpdatedFlag) {
      document.cookie = `${AUTH_UPDATED_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    syncAuthFromCookies();

    if (hasUpdatedFlag) {
      useToastStore.getState().info("Your access has been updated.");
    }
  }, [syncAuthFromCookies]);

  // Sync auth state and check auth_updated cookie on route navigation
  useEffect(() => {
    let cancelled = false;
    if (pathname) {
      queueMicrotask(() => {
        if (!cancelled) {
          syncAndNotify();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, syncAndNotify]);

  // Sync auth state and check auth_updated cookie on window focus and tab visibility
  useEffect(() => {
    const handleFocus = () => {
      syncAndNotify();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncAndNotify();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncAndNotify]);

  const allAuth = useMemo(() => {
    if (!user) {
      return [];
    }
    return [...user.roles, ...user.permissions];
  }, [user]);

  const isSuperAdmin = useMemo(
    () =>
      allAuth.includes("system.all") || allAuth.includes("ROLE_ADMINISTRATOR"),
    [allAuth]
  );

  const can = useCallback(
    (permissionOrRole: string | Array<string>) =>
      hasPermission(allAuth, permissionOrRole),
    [allAuth]
  );

  const hasRole = useCallback(
    (role: string) => {
      if (isSuperAdmin) {
        return true;
      }
      return user?.roles.includes(role) ?? false;
    },
    [isSuperAdmin, user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      permissions: user?.permissions ?? [],
      roles: user?.roles ?? [],
      can,
      hasRole,
      isSuperAdmin,
      refreshProfile,
      syncAuthFromCookies,
    }),
    [
      user,
      profile,
      can,
      hasRole,
      isSuperAdmin,
      refreshProfile,
      syncAuthFromCookies,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Declarative component for permission-based rendering
 */
export function Can({
  perform,
  children,
  fallback = null,
}: {
  perform: string | Array<string>;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAuth();
  if (can(perform)) {
    return children;
  }
  return fallback;
}
