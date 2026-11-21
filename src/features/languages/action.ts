"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { getCurrentUser, requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  ApiResponse,
  CreateLanguagePayload,
  UpdateLanguagePayload,
  LanguageItem,
  LanguagePageResponse,
} from "./types";

export interface GetLanguagesParams {
  search?: string;
  page?: number;
  size?: number;
}

export async function getAllLanguagesAction(options?: ActionRequestOptions) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
      data: [] as Array<LanguageItem>,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<LanguagePageResponse>>(
      `${ENDPOINTS.languages.list}?page=0&size=100`,
      {
        signal: options?.signal,
      }
    ),
    "Failed to load languages."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load languages.",
      data: [] as Array<LanguageItem>,
    };
  }

  return {
    success: true,
    data: res.data.data?.content || [],
    message: res.data.message,
  };
}

export async function getLanguagesAction(
  params: GetLanguagesParams = {},
  options?: ActionRequestOptions
) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
      data: createEmptyPage<LanguageItem>(
        params.size ?? 10
      ) satisfies LanguagePageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const search = params.search?.trim() ?? "";

  // Spring Pageable is 0-indexed
  const apiPage = Math.max(page - 1, 0);

  const query = new URLSearchParams({
    search,
    page: String(apiPage),
    size: String(size),
  });

  const res = await tryCatch(
    apiFetch<ApiResponse<LanguagePageResponse>>(
      `${ENDPOINTS.languages.list}?${query.toString()}`,
      { signal: options?.signal }
    ),
    "Failed to load languages. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load languages. Please try again.",
      data: createEmptyPage<LanguageItem>(size) satisfies LanguagePageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function getLanguageByIdAction(
  id: string,
  options?: ActionRequestOptions
) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.byId(id), {
      signal: options?.signal,
    }),
    "Failed to load language details. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load language details. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function createLanguageAction(payload: CreateLanguagePayload) {
  const auth = await requirePermission(
    "system.all",
    "You do not have permission to create languages."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.list, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Failed to create language. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create language. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Language created successfully",
  };
}

export async function updateLanguageAction(
  id: string,
  payload: UpdateLanguagePayload
) {
  const auth = await requirePermission(
    "system.all",
    "You do not have permission to update languages."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.byId(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Failed to update language. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update language. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Language updated successfully",
  };
}

export async function deleteLanguageAction(id: string) {
  const auth = await requirePermission(
    "system.all",
    "You do not have permission to delete languages."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.languages.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete language. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete language. Please try again.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Language deleted successfully",
  };
}
