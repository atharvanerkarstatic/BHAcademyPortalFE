"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  ApiResponse,
  CreateLanguagePayload,
  UpdateLanguagePayload,
  LanguageItem,
  LanguagePageResponse,
} from "./types";

export type GetLanguagesParams = {
  search?: string;
  page?: number;
  size?: number;
};

export async function getAllLanguagesAction() {
  try {
    const res = await apiFetch<ApiResponse<LanguagePageResponse>>(`/v1/languages?page=0&size=100`);
    return {
      success: true,
      data: res.data?.content || [],
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch all languages:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to load languages.",
      data: [] as LanguageItem[],
    };
  }
}

export async function getLanguagesAction(params: GetLanguagesParams = {}) {

  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

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

  try {
    const res = await apiFetch<ApiResponse<LanguagePageResponse>>(`/v1/languages?${query.toString()}`);
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch languages:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load languages. Please try again.";
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
      } as LanguagePageResponse,
    };
  }
}

export async function getLanguageByIdAction(id: string) {
  try {
    const res = await apiFetch<ApiResponse<LanguageItem>>(`/v1/languages/${id}`);
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch language ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load language details. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createLanguageAction(payload: CreateLanguagePayload) {
  try {
    const res = await apiFetch<ApiResponse<LanguageItem>>("/v1/languages", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    revalidatePath("/languages");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: res.data,
      message: res.message || "Language created successfully",
    };
  } catch (error) {
    console.error("Failed to create language:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create language. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateLanguageAction(id: string, payload: UpdateLanguagePayload) {
  try {
    const res = await apiFetch<ApiResponse<LanguageItem>>(`/v1/languages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    revalidatePath("/languages");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: res.data,
      message: res.message || "Language updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update language ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update language. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteLanguageAction(id: string) {
  try {
    const res = await apiFetch<ApiResponse<void>>(`/v1/languages/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/languages");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: res?.message || "Language deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete language ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete language. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
