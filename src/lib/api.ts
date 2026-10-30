import { cookies } from "next/headers";

import { config } from "@/config/env";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

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
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;

  const headers: Record<string, string> = {
    accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Only default to application/json if body is not FormData
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...init.headers,
    },
    cache: "no-store",
  });

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
