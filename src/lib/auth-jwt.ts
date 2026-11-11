export type JwtPayload = {
  jti?: string;
  sub?: string;
  iss?: string;
  aud?: string[];
  email?: string;
  ver?: number;
  auth?: string[];
  iat?: number;
  exp?: number;
  sid?: string;
  [key: string]: unknown;
};

export type AuthUser = {
  id?: string;
  email: string;
  permissions: string[];
  roles: string[];
  sessionId?: string;
};

/**
 * Base64Url decode without external dependencies.
 * Works seamlessly in Node.js, Next.js Edge, and browser runtimes.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function parseJwtPayload(token: string): JwtPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const jsonStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(jsonStr) as JwtPayload;

    // Reject expired JWTs if exp is provided
    if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowInSeconds) {
        return null;
      }
    }

    return payload;
  } catch (e) {
    console.error("Failed to parse JWT payload:", e);
    return null;
  }
}

export function isJwtValid(token: string): boolean {
  return parseJwtPayload(token) !== null;
}

export function extractAuthUser(token: string): AuthUser | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const authList = Array.isArray(payload.auth) ? payload.auth : [];
  const permissions = authList.filter((item) => !item.startsWith("ROLE_"));
  const roles = authList.filter((item) => item.startsWith("ROLE_"));

  return {
    id: payload.sub,
    email: payload.email || "",
    permissions,
    roles,
    sessionId: payload.sid,
  };
}

/**
 * Checks if the user has a specific permission or role.
 * Automatically handles `system.all` and `ROLE_ADMINISTRATOR` as superadmin overrides.
 */
export function hasPermission(
  userPermissionsOrRoles: string[] | undefined,
  requiredPermissionOrRole?: string | string[]
): boolean {
  if (!requiredPermissionOrRole) return true;
  if (!userPermissionsOrRoles || !Array.isArray(userPermissionsOrRoles)) return false;

  // Superuser wildcards
  if (
    userPermissionsOrRoles.includes("system.all") ||
    userPermissionsOrRoles.includes("ROLE_ADMINISTRATOR")
  ) {
    return true;
  }

  const required = Array.isArray(requiredPermissionOrRole)
    ? requiredPermissionOrRole
    : [requiredPermissionOrRole];

  return required.some((perm) => userPermissionsOrRoles.includes(perm));
}
