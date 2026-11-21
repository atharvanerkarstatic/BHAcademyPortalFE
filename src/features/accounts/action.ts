"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, apiFetchText } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { getCurrentUser, requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  AccountItem,
  AccountPageResponse,
  ApiResponse,
  BulkImportResponse,
  CreateAccountPayload,
  UpdateAccountPayload,
} from "./types";

export interface GetAccountsParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function getAccountsAction(
  params: GetAccountsParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "accounts.read",
    "You do not have permission to view accounts."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<AccountItem>(
        params.size ?? 10
      ) satisfies AccountPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;

  // Spring Pageable is 0-indexed on the backend
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort: params.sort || '["string"]',
  });

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<AccountPageResponse>>(
      `${ENDPOINTS.accounts.list}?${searchParams.toString()}`,
      { signal: options?.signal }
    ),
    "Failed to load accounts. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to fetch accounts:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load accounts. Please try again.",
      data: createEmptyPage<AccountItem>(size) satisfies AccountPageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function getAccountByIdAction(
  idOrBhBp: string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "accounts.read",
    "You do not have permission to view this account."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  // Try /v1/account/{id} first
  const singularRes = await tryCatch(
    apiFetch<ApiResponse<AccountItem>>(
      ENDPOINTS.accounts.byIdSingular(idOrBhBp),
      {
        signal: options?.signal,
      }
    ),
    "Failed to load account details."
  );
  if (singularRes.ok && singularRes.data?.data) {
    return {
      success: true,
      data: singularRes.data.data,
      message: singularRes.data.message,
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load account details.",
    };
  }

  // If /v1/account/{id} returned 404 or failed, try /v1/accounts/{id}
  const pluralRes = await tryCatch(
    apiFetch<ApiResponse<AccountItem>>(
      ENDPOINTS.accounts.byIdPlural(idOrBhBp),
      {
        signal: options?.signal,
      }
    ),
    "Failed to load account details."
  );
  if (pluralRes.ok && pluralRes.data?.data) {
    return {
      success: true,
      data: pluralRes.data.data,
      message: pluralRes.data.message,
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load account details.",
    };
  }

  console.warn(
    `Direct fetch failed for account ${idOrBhBp}, falling back to list lookup`
  );

  // Fallback: look up in getAccountsAction list
  const listRes = await getAccountsAction(
    { page: 1, size: 100, search: idOrBhBp },
    options
  );
  const found = listRes.data?.content?.find(
    (a) => a.id === idOrBhBp || a.bhBp === idOrBhBp || a.mobile === idOrBhBp
  );

  if (found) {
    return {
      success: true,
      data: found,
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load account details.",
    };
  }

  // Try without search if not found
  const allRes = await getAccountsAction({ page: 1, size: 50 }, options);
  const fallbackFound = allRes.data?.content?.find(
    (a) => a.id === idOrBhBp || a.bhBp === idOrBhBp || a.mobile === idOrBhBp
  );

  if (fallbackFound) {
    return {
      success: true,
      data: fallbackFound,
    };
  }

  return {
    success: false,
    error: "Account details not found.",
  };
}

export async function uploadMediaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  // If path is not set or needs timestamp, ensure path="profile_image_<timestamp>"
  if (!formData.has("path") || !formData.get("path")) {
    formData.set("path", `profile_image_${Date.now()}`);
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<string>>(ENDPOINTS.accounts.upload, {
      method: "POST",
      body: formData,
    }),
    "Failed to upload file."
  );

  if (!res.ok) {
    console.error("Failed to upload media:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to upload file.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "File uploaded successfully",
  };
}

export async function createAccountAction(
  payload: FormData | CreateAccountPayload
) {
  const auth = await requirePermission(
    "accounts.create",
    "You do not have permission to create accounts."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const isFormData = payload instanceof FormData;
  const res = await tryCatch(
    apiFetch<ApiResponse<AccountItem>>(ENDPOINTS.accounts.create, {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
    }),
    "Failed to create account. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to create account:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create account. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Account created successfully",
  };
}

export async function updateAccountAction(
  idOrBhBp: string,
  payload: FormData | UpdateAccountPayload
) {
  const auth = await requirePermission(
    ["users.update", "accounts.update"],
    "You do not have permission to update accounts."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const isFormData = payload instanceof FormData;
  const res = await tryCatch(
    apiFetch<ApiResponse<AccountItem>>(
      ENDPOINTS.accounts.byIdSingular(idOrBhBp),
      {
        method: "PUT",
        body: isFormData ? payload : JSON.stringify(payload),
      }
    ),
    "Failed to update account. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to update account ${idOrBhBp}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update account. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Account updated successfully",
  };
}

export async function exportAccountsAction() {
  const auth = await requirePermission(
    ["users.read", "accounts.export"],
    "You do not have permission to export accounts."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetchText(ENDPOINTS.accounts.export),
    "Failed to export accounts"
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.message,
    };
  }

  return {
    success: true,
    data: res.data.text,
    filename: `accounts_export_${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function importAccountsAction(formData: FormData) {
  const auth = await requirePermission(
    ["accounts.import", "users.create"],
    "You do not have permission to import accounts."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<BulkImportResponse>>(ENDPOINTS.accounts.import, {
      method: "POST",
      body: formData,
    }),
    "Failed to import accounts."
  );

  if (!res.ok) {
    console.error("Failed to import accounts:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to import accounts.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Import processed successfully",
  };
}

export async function importAccountBhbpAction(formData: FormData) {
  const auth = await requirePermission(
    ["accounts.import", "users.create"],
    "You do not have permission to import BP numbers."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<BulkImportResponse>>(ENDPOINTS.accounts.importBhbp, {
      method: "POST",
      body: formData,
    }),
    "Failed to import BP numbers."
  );

  if (!res.ok) {
    console.error("Failed to import BP numbers:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to import BP numbers.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Import processed successfully",
  };
}

export type SampleImportType =
  | "ACCOUNTS"
  | "ACCOUNT_BHBP"
  | "COURSE_TRANSLATIONS"
  | "COURSE_VIDEOS"
  | "QUIZ";

export async function getSampleImportAction(type: SampleImportType) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  const res = await tryCatch(
    apiFetchText(ENDPOINTS.accounts.sampleImport(type)),
    "Failed to download sample file."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.message,
    };
  }

  const filenameMap: Record<SampleImportType, string> = {
    ACCOUNTS: "accounts_sample.csv",
    ACCOUNT_BHBP: "account_bhbp_sample.csv",
    COURSE_TRANSLATIONS: "course_translations_sample.csv",
    COURSE_VIDEOS: "course_videos_sample.csv",
    QUIZ: "quiz_sample.csv",
  };

  return {
    success: true,
    data: res.data.text,
    filename: filenameMap[type] || `${type.toLowerCase()}_sample.csv`,
  };
}
