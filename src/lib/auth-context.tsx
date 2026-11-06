"use client";

import * as React from "react";
import { AUTH_PERMS_COOKIE } from "@/lib/auth-cookies";
import { hasPermission, type AuthUser } from "@/lib/auth-jwt";
import { getCurrentUserProfile, type UserProfile } from "@/features/profile/action";

type AuthContextType = {
  user: AuthUser | null;
  profile: UserProfile | null;
  permissions: string[];
  roles: string[];
  can: (permissionOrRole: string | string[]) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  refreshProfile: () => Promise<void>;
  syncAuthFromCookies: () => void;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function readUserFromCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_PERMS_COOKIE}=`));

  if (!match) return null;

  try {
    const raw = decodeURIComponent(match.split("=")[1]);
    const parsed = JSON.parse(raw);
    const authList: string[] = Array.isArray(parsed.auth) ? parsed.auth : [];

    return {
      id: parsed.id,
      email: parsed.email || "",
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
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = React.useState<AuthUser | null>(() => initialUser ?? readUserFromCookie());
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  // Synchronize user state immediately from user_perms cookie
  const syncAuthFromCookies = React.useCallback(() => {
    const freshUser = readUserFromCookie();
    if (!freshUser) return;

    setUser((prev) => {
      // Check if permissions/roles or user actually changed
      const prevPerms = prev ? [...prev.roles, ...prev.permissions].sort().join(",") : "";
      const freshPerms = [...freshUser.roles, ...freshUser.permissions].sort().join(",") ;
      if (prev?.id === freshUser.id && prev?.email === freshUser.email && prevPerms === freshPerms) {
        return prev;
      }
      return freshUser;
    });
  }, []);

  // Function to fetch or re-fetch profile details using the existing user-details API
  const refreshProfile = React.useCallback(async () => {
    try {
      const res = await getCurrentUserProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error("Failed to load user profile in AuthProvider:", err);
    }
  }, []);

  // Sync on mount, window focus, visibility change, and periodically
  React.useEffect(() => {
    syncAuthFromCookies();
    refreshProfile();

    const handleSync = () => {
      syncAuthFromCookies();
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    // Periodic check every 5 seconds to catch token refresh from background actions
    const interval = setInterval(syncAuthFromCookies, 5000);

    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
      clearInterval(interval);
    };
  }, [syncAuthFromCookies, refreshProfile]);

  const allAuth = React.useMemo(() => {
    if (!user) return [];
    return [...user.roles, ...user.permissions];
  }, [user]);

  const isSuperAdmin = React.useMemo(() => {
    return allAuth.includes("system.all") || allAuth.includes("ROLE_ADMINISTRATOR");
  }, [allAuth]);

  const can = React.useCallback(
    (permissionOrRole: string | string[]) => {
      return hasPermission(allAuth, permissionOrRole);
    },
    [allAuth]
  );

  const hasRole = React.useCallback(
    (role: string) => {
      if (isSuperAdmin) return true;
      return user?.roles.includes(role) ?? false;
    },
    [isSuperAdmin, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        permissions: user?.permissions ?? [],
        roles: user?.roles ?? [],
        can,
        hasRole,
        isSuperAdmin,
        refreshProfile,
        syncAuthFromCookies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
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
  perform: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useAuth();
  if (can(perform)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
