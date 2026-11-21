import { cookies } from "next/headers";

import { config } from "@/config/env";
import { refreshTokens } from "@/lib/auth-api";
import {
  ACCESS_COOKIE,
  ALL_AUTH_COOKIES,
  REFRESH_COOKIE,
  buildAuthCookies,
} from "@/lib/auth-cookies";
import { extractAuthUser } from "@/lib/auth-jwt";
import { extractErrorMessage } from "@/lib/type-guards";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
  }
}

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  defaultAccept = "application/json"
): Promise<Response> {
  const cookieStore = await cookies();
  let token = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const buildHeaders = (bearer?: string): Headers => {
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) {
      headers.set("accept", defaultAccept);
    }
    if (bearer) {
      headers.set("Authorization", `Bearer ${bearer}`);
    }
    if (!(init.body instanceof FormData) && !headers.has("Content-Type") && defaultAccept === "application/json") {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  let res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: buildHeaders(token),
    cache: "no-store",
  });

  // If unauthorized, redirect/revoked access (307), or forbidden and refreshToken is available, try to refresh token and retry
  if ((res.status === 401 || res.status === 307 || res.status === 403) && refreshToken) {
    try {
      const fresh = await refreshTokens(refreshToken);
      if (fresh?.accessToken && extractAuthUser(fresh.accessToken)) {
        token = fresh.accessToken;
        const cookieList = buildAuthCookies(fresh);
        for (const cookie of cookieList) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }

        res = await fetch(`${config.apiBaseUrl}${path}`, {
          ...init,
          headers: buildHeaders(token),
          cache: "no-store",
        });
      } else {
        for (const name of ALL_AUTH_COOKIES) {
          cookieStore.delete(name);
        }
      }
    } catch {
      for (const name of ALL_AUTH_COOKIES) {
        cookieStore.delete(name);
      }
    }
  }

  return res;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let errorDetails = `Request failed: ${res.status}`;
  let errBody: unknown = null;

  try {
    const text = await res.text();
    if (text) {
      try {
        errBody = JSON.parse(text);
        const extracted = extractErrorMessage(errBody);
        if (extracted) {
          errorDetails = extracted;
        }
      } catch {
        errorDetails = text;
      }
    }
  } catch {
    // Response body could not be read
  }

  return new ApiError(res.status, errorDetails, errBody);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authorizedFetch(path, init, "application/json");

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json();
  // Boundary: backend JSON response is typed by caller contract
  return data as T;
}

export async function apiFetchText(
  path: string,
  init: RequestInit = {},
  accept = "*/*"
): Promise<{ text: string; contentDisposition: string | null }> {
  const res = await authorizedFetch(path, init, accept);

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const text = await res.text();
  return {
    text,
    contentDisposition: res.headers.get("content-disposition"),
  };
}
