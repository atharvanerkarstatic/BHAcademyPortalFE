import { cookies } from "next/headers";

import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { extractAuthUser, hasPermission } from "@/lib/auth-jwt";
import type { AuthUser } from "@/lib/auth-jwt";

export type RequirePermissionResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; status: 401 | 403 };

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return extractAuthUser(token);
}

export async function requirePermission(
  permission: string | Array<string>,
  errorMessage: string
): Promise<RequirePermissionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: errorMessage,
      status: 401,
    };
  }

  const userPerms = [...user.roles, ...user.permissions];
  if (!hasPermission(userPerms, permission)) {
    return {
      ok: false,
      error: errorMessage,
      status: 403,
    };
  }

  return { ok: true, user };
}
