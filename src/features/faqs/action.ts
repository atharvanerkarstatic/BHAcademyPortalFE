"use server";

import { revalidatePath } from "next/cache";
import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type { ApiResponse, CreateFaqPayload, UpdateFaqPayload, FaqItem, FaqPageResponse } from "./types";

export type GetFaqsParams = {
  language?: string;
  page?: number;
  size?: number;
};

export async function getFaqsAction(params: GetFaqsParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];
  if (!hasPermission(userPerms, "faqs.read")) {
    return {
      success: false,
      error: "You do not have permission to view FAQs.",
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
      } as FaqPageResponse,
    };
  }

  const language = params.language ?? "en";
  const page = params.page ?? 1;
  const size = params.size ?? 10;

  // Spring Pageable is 0-indexed
  const apiPage = Math.max(page - 1, 0);

  const query = new URLSearchParams({
    language,
    page: String(apiPage),
    size: String(size),
  });

  try {
    const res = await apiFetch<ApiResponse<FaqPageResponse>>(
      `${ENDPOINTS.faqs.list}?${query.toString()}`
    );
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch FAQs:", error);
    const message = error instanceof ApiError ? error.message : "Failed to load FAQs. Please try again.";
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
      } as FaqPageResponse,
    };
  }
}

export async function getFaqByIdAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];
  if (!hasPermission(userPerms, "faqs.read")) {
    return {
      success: false,
      error: "You do not have permission to view this FAQ.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.byId(id));
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch FAQ ${id}:`, error);
    const message = error instanceof ApiError ? error.message : "Failed to load FAQ details. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createFaqAction(payload: CreateFaqPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];
  if (!hasPermission(userPerms, "faqs.create")) {
    return {
      success: false,
      error: "You do not have permission to create FAQs.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.list, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    revalidatePath("/faqs");

    return {
      success: true,
      data: res.data,
      message: res.message || "FAQ created successfully",
    };
  } catch (error) {
    console.error("Failed to create FAQ:", error);
    const message = error instanceof ApiError ? error.message : "Failed to create FAQ. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateFaqAction(id: number | string, payload: UpdateFaqPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];
  if (!hasPermission(userPerms, "faqs.update")) {
    return {
      success: false,
      error: "You do not have permission to update FAQs.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.byId(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    revalidatePath("/faqs");

    return {
      success: true,
      data: res.data,
      message: res.message || "FAQ updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update FAQ ${id}:`, error);
    const message = error instanceof ApiError ? error.message : "Failed to update FAQ. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteFaqAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];
  if (!hasPermission(userPerms, "faqs.delete")) {
    return {
      success: false,
      error: "You do not have permission to delete FAQs.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<void>>(ENDPOINTS.faqs.byId(id), {
      method: "DELETE",
    });

    revalidatePath("/faqs");

    return {
      success: true,
      message: res?.message || "FAQ deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete FAQ ${id}:`, error);
    const message = error instanceof ApiError ? error.message : "Failed to delete FAQ. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
