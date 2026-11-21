"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { UserProfile } from "@/features/profile/action";
import { AUTH_PERMS_COOKIE, AUTH_UPDATED_COOKIE } from "@/lib/auth-cookies";
import { hasPermission } from '@/lib/auth-jwt';
import type { AuthUser } from '@/lib/auth-jwt';
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { getStringProp, isRecord } from "@/lib/type-guards";
import { useToastStore } from "@/stores/toast-store";

type AuthContextType = {
  user: AuthUser | null;
  profile: UserProfile | null;
  permissions: Array<string>;
  roles: Array<string>;
  can: (permissionOrRole: string | Array<string>) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  refreshProfile: () => Promise<void>;
  syncAuthFromCookies: () => void;
};

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

    const authList = Array.isArray(parsed.auth)
      ? parsed.auth.filter((item): item is string => typeof item === "string")
      : [];

    return {
      id: getStringProp(parsed, "id"),
      email: getStringProp(parsed, "email") ?? "",
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
  const [user, setUser] = useState<AuthUser | null>(() => initialUser ?? readUserFromCookie());

  const { data: profile = null } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => portalGet<UserProfile>("profile", undefined, signal),
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
      const prevPerms = prev ? [...prev.roles, ...prev.permissions].sort().join(",") : "";
      const freshPerms = [...freshUser.roles, ...freshUser.permissions].sort().join(",");
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

  // Check for auth_updated cookie to display "Your access has been updated." toast
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const checkUpdatedFlag = () => {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${AUTH_UPDATED_COOKIE}=`));

      if (match) {
        document.cookie = `${AUTH_UPDATED_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        syncAuthFromCookies();
        useToastStore.getState().info("Your access has been updated.");
      }
    };

    const interval = setInterval(checkUpdatedFlag, 1000);
    return () => clearInterval(interval);
  }, [syncAuthFromCookies]);

  // Sync on window focus, visibility change, and periodically
  useEffect(() => {
    const handleSync = () => {
      syncAuthFromCookies();
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);
    const interval = setInterval(syncAuthFromCookies, 5000);

    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
      clearInterval(interval);
    };
  }, [syncAuthFromCookies]);

  const allAuth = useMemo(() => {
    if (!user) {
      return [];
    }
    return [...user.roles, ...user.permissions];
  }, [user]);

  const isSuperAdmin = useMemo(
    () => allAuth.includes("system.all") || allAuth.includes("ROLE_ADMINISTRATOR"),
    [allAuth]
  );

  const can = useCallback(
    (permissionOrRole: string | Array<string>) => hasPermission(allAuth, permissionOrRole),
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
    [user, profile, can, hasRole, isSuperAdmin, refreshProfile, syncAuthFromCookies]
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
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
