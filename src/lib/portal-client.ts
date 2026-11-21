import { extractErrorMessage, isRecord } from "./type-guards";

export class PortalQueryError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

export async function portalGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  signal?: AbortSignal
): Promise<T> {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value).length > 0) {
        search.set(key, String(value));
      }
    }
  }

  const query = search.toString();
  const url = `/api/portal/${path}${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new PortalQueryError(
      extractErrorMessage(body) ?? `Request failed (${res.status})`,
      res.status
    );
  }

  if (isRecord(body) && body.success === false) {
    throw new PortalQueryError(
      extractErrorMessage(body) ?? "Request failed",
      typeof body.status === "number" ? body.status : undefined
    );
  }

  if (isRecord(body) && "data" in body) {
    // Boundary: BFF route handler wraps typed server action response in { success: true, data }
    return body.data as T;
  }

  return body as T;
}
