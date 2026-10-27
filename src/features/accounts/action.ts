"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  AccountItem,
  AccountPageResponse,
  ApiResponse,
  BulkImportResponse,
  BulkImportError,
} from "./types";

export type GetAccountsParams = {
  search?: string;
  page?: number;
  size?: number;
  sort?: "ASC" | "DESC" | string;
};

export async function getAccountsAction(params: GetAccountsParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read")) {
    return {
      success: false,
      error: "You do not have permission to view accounts.",
      data: {
        content: [],
        page: 1,
        size: params.size ?? 10,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      } as AccountPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;

  // Spring Pageable is 0-indexed on the backend
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams();
  searchParams.set("search", params.search ? params.search.trim() : "");
  searchParams.set("page", String(apiPage));
  searchParams.set("size", String(size));
  searchParams.set("sort", params.sort || '["string"]');

  try {
    const res = await apiFetch<ApiResponse<AccountPageResponse>>(
      `/v1/accounts?${searchParams.toString()}`
    );

    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load accounts. Please try again.";
    return {
      success: false,
      error: message,
      data: {
        content: [],
        page: 1,
        size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      } as AccountPageResponse,
    };
  }
}

export async function getAccountByIdAction(idOrBhBp: string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "accounts.read")) {
    return {
      success: false,
      error: "You do not have permission to view this account.",
    };
  }

  try {
    // Try /v1/account/{id} first
    const res = await apiFetch<ApiResponse<AccountItem>>(`/v1/account/${encodeURIComponent(idOrBhBp)}`);
    if (res && res.data) {
      return {
        success: true,
        data: res.data,
        message: res.message,
      };
    }
  } catch (error) {
    // If /v1/account/{id} returned 404 or failed, try /v1/accounts/{id}
    try {
      const altRes = await apiFetch<ApiResponse<AccountItem>>(`/v1/accounts/${encodeURIComponent(idOrBhBp)}`);
      if (altRes && altRes.data) {
        return {
          success: true,
          data: altRes.data,
          message: altRes.message,
        };
      }
    } catch {
      // Both single item endpoints failed
    }

    console.warn(`Direct fetch failed for account ${idOrBhBp}, falling back to list lookup`);
  }

  // Fallback: look up in getAccountsAction list
  try {
    const listRes = await getAccountsAction({ page: 1, size: 100, search: idOrBhBp });
    const found = listRes.data?.content?.find(
      (a) =>
        String(a.id) === String(idOrBhBp) ||
        String(a.bhBp) === String(idOrBhBp) ||
        a.mobile === idOrBhBp
    );

    if (found) {
      return {
        success: true,
        data: found,
      };
    }

    // Try without search if not found
    const allRes = await getAccountsAction({ page: 1, size: 50 });
    const fallbackFound = allRes.data?.content?.find(
      (a) =>
        String(a.id) === String(idOrBhBp) ||
        String(a.bhBp) === String(idOrBhBp) ||
        a.mobile === idOrBhBp
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
  } catch (err) {
    return {
      success: false,
      error: "Failed to load account details.",
    };
  }
}

export async function uploadMediaAction(formData: FormData) {
  try {
    // If path is not set or needs timestamp, ensure path="profile_image_<timestamp>"
    if (!formData.has("path") || !formData.get("path")) {
      formData.set("path", `profile_image_${Date.now()}`);
    }

    const res = await apiFetch<ApiResponse<string>>("/v1/upload", {
      method: "POST",
      body: formData,
    });

    return {
      success: true,
      data: res.data,
      message: res.message || "File uploaded successfully",
    };
  } catch (error) {
    console.error("Failed to upload media:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to upload file.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createAccountAction(payload: FormData | Record<string, unknown>) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.create") && !hasPermission(userPerms, "accounts.create")) {
    return {
      success: false,
      error: "You do not have permission to create accounts.",
    };
  }

  try {
    const isFormData = payload instanceof FormData;
    const res = await apiFetch<ApiResponse<AccountItem>>("/v1/account", {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
    });

    return {
      success: true,
      data: res?.data,
      message: res?.message || "Account created successfully",
    };
  } catch (error) {
    console.error("Failed to create account:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create account. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateAccountAction(
  idOrBhBp: string,
  payload: FormData | Record<string, unknown>
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "accounts.update")) {
    return {
      success: false,
      error: "You do not have permission to update accounts.",
    };
  }

  try {
    const isFormData = payload instanceof FormData;
    const res = await apiFetch<ApiResponse<AccountItem>>(
      `/v1/account/${encodeURIComponent(idOrBhBp)}`,
      {
        method: "PUT",
        body: isFormData ? payload : JSON.stringify(payload),
      }
    );

    return {
      success: true,
      data: res?.data,
      message: res?.message || "Account updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update account ${idOrBhBp}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update account. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function exportAccountsAction() {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "accounts.export")) {
    return {
      success: false,
      error: "You do not have permission to export accounts.",
    };
  }

  try {
    const { cookies } = await import("next/headers");
    const { ACCESS_COOKIE } = await import("@/lib/auth-cookies");
    const { config } = await import("@/config/env");

    const token = (await cookies()).get(ACCESS_COOKIE)?.value;

    const res = await fetch(`${config.apiBaseUrl}/v1/accounts/export`, {
      method: "GET",
      headers: {
        Accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Export failed with status: ${res.status}`);
    }

    const csvContent = await res.text();

    return {
      success: true,
      data: csvContent,
      filename: `accounts_export_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  } catch (error) {
    console.error("Failed to export accounts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export accounts",
    };
  }
}

export async function importAccountsAction(formData: FormData) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "accounts.import") && !hasPermission(userPerms, "users.create")) {
    return {
      success: false,
      error: "You do not have permission to import accounts.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<BulkImportResponse>>("/v1/accounts/import", {
      method: "POST",
      body: formData,
    });

    return {
      success: true,
      data: res.data,
      message: res.message || "Import processed successfully",
    };
  } catch (error) {
    console.error("Failed to import accounts:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to import accounts.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function importAccountBhbpAction(formData: FormData) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "accounts.import") && !hasPermission(userPerms, "users.create")) {
    return {
      success: false,
      error: "You do not have permission to import BP numbers.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<BulkImportResponse>>("/v1/accounts/import-bhbp", {
      method: "POST",
      body: formData,
    });

    return {
      success: true,
      data: res.data,
      message: res.message || "Import processed successfully",
    };
  } catch (error) {
    console.error("Failed to import BP numbers:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to import BP numbers.";
    return {
      success: false,
      error: message,
    };
  }
}

export type SampleImportType =
  | "ACCOUNTS"
  | "ACCOUNT_BHBP"
  | "COURSE_TRANSLATIONS"
  | "COURSE_VIDEOS";

export async function getSampleImportAction(type: SampleImportType) {
  try {
    const { cookies } = await import("next/headers");
    const { ACCESS_COOKIE } = await import("@/lib/auth-cookies");
    const { config } = await import("@/config/env");

    const token = (await cookies()).get(ACCESS_COOKIE)?.value;

    const res = await fetch(`${config.apiBaseUrl}/v1/import/sample/${type}`, {
      method: "GET",
      headers: {
        Accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch sample file: ${res.status}`);
    }

    const content = await res.text();
    const filenameMap: Record<SampleImportType, string> = {
      ACCOUNTS: "accounts_sample.csv",
      ACCOUNT_BHBP: "account_bhbp_sample.csv",
      COURSE_TRANSLATIONS: "course_translations_sample.csv",
      COURSE_VIDEOS: "course_videos_sample.csv",
    };

    return {
      success: true,
      data: content,
      filename: filenameMap[type] || `${type.toLowerCase()}_sample.csv`,
    };
  } catch (error) {
    console.error(`Failed to fetch sample for ${type}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download sample file.",
    };
  }
}
