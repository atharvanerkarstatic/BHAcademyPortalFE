"use server";

import { revalidatePath } from "next/cache";
import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, ApiError } from "@/lib/api";
import { createEmptyPage } from "@/lib/type-guards";
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
    const res = await apiFetch<ApiResponse<LanguagePageResponse>>(
      `${ENDPOINTS.languages.list}?page=0&size=100`
    );
    return {
      success: true,
      data: res.data?.content || [],
      message: res.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to load languages.",
      data: [] as Array<LanguageItem>,
    };
  }
}

export async function getLanguagesAction(params: GetLanguagesParams = {}) {
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
    const res = await apiFetch<ApiResponse<LanguagePageResponse>>(
      `${ENDPOINTS.languages.list}?${query.toString()}`
    );
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Failed to load languages. Please try again.";
    return {
      success: false,
      error: message,
      data: createEmptyPage<LanguageItem>(size) satisfies LanguagePageResponse,
    };
  }
}

export async function getLanguageByIdAction(id: string) {
  try {
    const res = await apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.byId(id));
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
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
    const res = await apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.list, {
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
    const res = await apiFetch<ApiResponse<LanguageItem>>(ENDPOINTS.languages.byId(id), {
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
    const res = await apiFetch<ApiResponse<void>>(ENDPOINTS.languages.byId(id), {
      method: "DELETE",
    });

    revalidatePath("/languages");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: res?.message || "Language deleted successfully",
    };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Failed to delete language. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
