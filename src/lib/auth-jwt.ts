import { isRecord } from "./type-guards";

export type JwtPayload = {
  jti?: string;
  sub?: string;
  iss?: string;
  aud?: Array<string>;
  email?: string;
  ver?: number;
  auth?: Array<string>;
  iat?: number;
  exp?: number;
  sid?: string;
};

export type AuthUser = {
  id?: string;
  email: string;
  permissions: Array<string>;
  roles: Array<string>;
  sessionId?: string;
};

/**
 * Base64Url decode without external dependencies.
 * Works seamlessly in Node.js, Next.js Edge, and browser runtimes.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replaceAll("-", "+").replaceAll("_", "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    const binary = atob(base64);
    const encoded = Array.from(binary, (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join("");
    return decodeURIComponent(encoded);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

function toStringArray(value: unknown): Array<string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function parseJwtPayload(token: string): JwtPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(parts[1]);
    const parsed: unknown = JSON.parse(jsonStr);
    if (!isRecord(parsed)) {
      return null;
    }

    const exp = typeof parsed.exp === "number" && Number.isFinite(parsed.exp) ? parsed.exp : undefined;
    if (exp !== undefined) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (exp <= nowInSeconds) {
        return null;
      }
    }

    return {
      jti: typeof parsed.jti === "string" ? parsed.jti : undefined,
      sub: typeof parsed.sub === "string" ? parsed.sub : undefined,
      iss: typeof parsed.iss === "string" ? parsed.iss : undefined,
      aud: toStringArray(parsed.aud),
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      ver: typeof parsed.ver === "number" ? parsed.ver : undefined,
      auth: toStringArray(parsed.auth),
      iat: typeof parsed.iat === "number" ? parsed.iat : undefined,
      exp,
      sid: typeof parsed.sid === "string" ? parsed.sid : undefined,
    };
  } catch {
    return null;
  }
}

export function isJwtValid(token: string): boolean {
  return parseJwtPayload(token) !== null;
}

export function extractAuthUser(token: string): AuthUser | null {
  const payload = parseJwtPayload(token);
  if (!payload) {
    return null;
  }

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
  userPermissionsOrRoles: Array<string> | undefined,
  requiredPermissionOrRole?: string | Array<string>
): boolean {
  if (!requiredPermissionOrRole) {
    return true;
  }
  if (!userPermissionsOrRoles || !Array.isArray(userPermissionsOrRoles)) {
    return false;
  }

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
