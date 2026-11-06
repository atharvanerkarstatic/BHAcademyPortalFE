import { cookies } from "next/headers";

import { config } from "@/config/env";
import { ACCESS_COOKIE, REFRESH_COOKIE, buildAuthCookies } from "@/lib/auth-cookies";
import { refreshTokens } from "@/lib/auth-api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  let token = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const buildHeaders = (bearer?: string) => {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    };

    if (!(init.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    return {
      ...headers,
      ...init.headers,
    };
  };

  let res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: buildHeaders(token),
    cache: "no-store",
  });

  // If unauthorized and refreshToken is available, try to refresh token and retry
  if (res.status === 401 && refreshToken) {
    try {
      const fresh = await refreshTokens(refreshToken);
      if (fresh?.accessToken) {
        token = fresh.accessToken;
        const cookieList = buildAuthCookies(fresh);
        for (const c of cookieList) {
          cookieStore.set(c.name, c.value, c.options);
        }

        // Retry the original request with the fresh token
        res = await fetch(`${config.apiBaseUrl}${path}`, {
          ...init,
          headers: buildHeaders(token),
          cache: "no-store",
        });
      }
    } catch (refreshErr) {
      console.error("Token refresh failed in apiFetch:", refreshErr);
    }
  }

  if (!res.ok) {
    let errorDetails = `Request failed: ${res.status}`;
    let errBody: unknown = null;
    try {
      errBody = await res.json();
      if (errBody && typeof errBody === "object") {
        const obj = errBody as Record<string, unknown>;
        if (typeof obj.message === "string" && obj.message) {
          errorDetails = obj.message;
        } else if (typeof obj.error === "string" && obj.error) {
          errorDetails = obj.error;
        } else if (typeof obj.details === "string" && obj.details) {
          errorDetails = obj.details;
        }
      }
    } catch {
      // not JSON
    }
    console.error(`API Error [${res.status}] on ${path}:`, errBody || errorDetails);
    throw new ApiError(res.status, errorDetails, errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
