import { ApiError } from "@/lib/api";

export interface FailureInfo {
  message: string;
  status: number;
  data?: unknown;
  isApiError: boolean;
  cause: unknown;
}

export type SafeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FailureInfo };

export async function tryCatch<T>(
  promise: Promise<T>,
  fallbackMessage = "An unexpected error occurred."
): Promise<SafeResult<T>> {
  try {
    const data = await promise;
    return { ok: true, data };
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        error: {
          message: error.message || fallbackMessage,
          status: error.status,
          data: error.data,
          isApiError: true,
          cause: error,
        },
      };
    }

    if (error instanceof Error) {
      return {
        ok: false,
        error: {
          message: error.message || fallbackMessage,
          status: 500,
          isApiError: false,
          cause: error,
        },
      };
    }

    return {
      ok: false,
      error: {
        message: fallbackMessage,
        status: 500,
        isApiError: false,
        cause: error,
      },
    };
  }
}
