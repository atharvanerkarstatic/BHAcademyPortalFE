import { ENDPOINTS } from "@/config/endpoints";
import { config } from "@/config/env";
import type { TokenResponse } from "./auth-cookies";
import { isRecord } from "./type-guards";

// The refresh token is single-use (the API returns a new one each time).
// If several requests refresh at once, they share one call instead of
// racing each other and invalidating the session.
const inflight = new Map<string, Promise<TokenResponse | null>>();

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    typeof value.tokenType === "string" &&
    typeof value.expiresInSeconds === "number" &&
    Number.isFinite(value.expiresInSeconds) &&
    value.expiresInSeconds > 0 &&
    typeof value.issuedAt === "string"
  );
}

async function callRefresh(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const res = await fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const body: unknown = await res.json();
    const candidate = isRecord(body) && "data" in body && body.data ? body.data : body;
    return isTokenResponse(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function refreshTokens(refreshToken: string) {
  const existing = inflight.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = callRefresh(refreshToken);
  inflight.set(refreshToken, promise);
  setTimeout(() => inflight.delete(refreshToken), 10_000);
  return promise;
}
