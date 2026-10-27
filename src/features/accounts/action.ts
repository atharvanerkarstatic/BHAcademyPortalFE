"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type { AccountItem, AccountPageResponse, ApiResponse } from "./types";

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

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
  });

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

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
    const res = await apiFetch<ApiResponse<AccountItem>>(`/v1/account/${encodeURIComponent(idOrBhBp)}`);
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch account ${idOrBhBp}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load account details.";
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

export async function updateAccountAction(idOrBhBp: string, formData: FormData) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "accounts.update")) {
    return {
      success: false,
      error: "You do not have permission to update accounts.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<AccountItem>>(
      `/v1/account/${encodeURIComponent(idOrBhBp)}`,
      {
        method: "PUT",
        body: formData,
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
    const res = await apiFetch<string | Record<string, unknown>>("/v1/accounts/export");
    return {
      success: true,
      data: res,
    };
  } catch (error) {
    console.error("Failed to export accounts:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to export accounts",
    };
  }
}
