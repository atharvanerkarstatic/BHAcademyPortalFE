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

const DEFAULT_JSON_TIMEOUT_MS = 15_000;
const DEFAULT_TEXT_TIMEOUT_MS = 60_000;

export type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export interface ActionRequestOptions {
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildRequestSignal(
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return callerSignal instanceof AbortSignal
    ? AbortSignal.any([callerSignal, timeoutSignal])
    : timeoutSignal;
}

async function authorizedFetch(
  path: string,
  init: ApiFetchOptions = {},
  defaultAccept = "application/json",
  defaultTimeoutMs = DEFAULT_JSON_TIMEOUT_MS
): Promise<Response> {
  const { timeoutMs, signal: callerSignal, ...fetchInit } = init;
  const effectiveTimeoutMs = timeoutMs ?? defaultTimeoutMs;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const buildHeaders = (bearer?: string): Headers => {
    const headers = new Headers(fetchInit.headers);
    if (!headers.has("accept")) {
      headers.set("accept", defaultAccept);
    }
    if (bearer) {
      headers.set("Authorization", `Bearer ${bearer}`);
    }
    if (
      !(fetchInit.body instanceof FormData) &&
      !headers.has("Content-Type") &&
      defaultAccept === "application/json"
    ) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  let res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...fetchInit,
    headers: buildHeaders(token),
    signal: buildRequestSignal(callerSignal, effectiveTimeoutMs),
    cache: "no-store",
  });

  // If unauthorized, redirect/revoked access (307), or forbidden and refreshToken is available, try to refresh token and retry
  if (
    (res.status === 401 || res.status === 307 || res.status === 403) &&
    refreshToken &&
    !callerSignal?.aborted
  ) {
    let refreshedToken: string | undefined;
    try {
      const fresh = await refreshTokens(refreshToken);
      if (fresh?.accessToken && extractAuthUser(fresh.accessToken)) {
        refreshedToken = fresh.accessToken;
        const cookieList = buildAuthCookies(fresh);
        for (const cookie of cookieList) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
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

    if (refreshedToken) {
      res = await fetch(`${config.apiBaseUrl}${path}`, {
        ...fetchInit,
        headers: buildHeaders(refreshedToken),
        signal: buildRequestSignal(callerSignal, effectiveTimeoutMs),
        cache: "no-store",
      });
    }
  }

  return res;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let errorDetails = `Request failed: ${res.status}`;
  let errBody: unknown;

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

  return new ApiError(res.status, errorDetails, errBody ?? null);
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {}
): Promise<T> {
  const res = await authorizedFetch(
    path,
    init,
    "application/json",
    DEFAULT_JSON_TIMEOUT_MS
  );

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
  init: ApiFetchOptions = {},
  accept = "*/*"
): Promise<{ text: string; contentDisposition: string | null }> {
  const res = await authorizedFetch(
    path,
    init,
    accept,
    DEFAULT_TEXT_TIMEOUT_MS
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const text = await res.text();
  return {
    text,
    contentDisposition: res.headers.get("content-disposition"),
  };
}
