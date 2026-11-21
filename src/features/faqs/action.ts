"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  ApiResponse,
  CreateFaqPayload,
  UpdateFaqPayload,
  FaqItem,
  FaqPageResponse,
} from "./types";

export interface GetFaqsParams {
  language?: string;
  page?: number;
  size?: number;
}

export async function getFaqsAction(
  params: GetFaqsParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "faqs.read",
    "You do not have permission to view FAQs."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<FaqItem>(
        params.size ?? 10
      ) satisfies FaqPageResponse,
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

  const res = await tryCatch(
    apiFetch<ApiResponse<FaqPageResponse>>(
      `${ENDPOINTS.faqs.list}?${query.toString()}`,
      {
        signal: options?.signal,
      }
    ),
    "Failed to load FAQs. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to fetch FAQs:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load FAQs. Please try again.",
      data: createEmptyPage<FaqItem>(size) satisfies FaqPageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function getFaqByIdAction(
  id: number | string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "faqs.read",
    "You do not have permission to view this FAQ."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.byId(id), {
      signal: options?.signal,
    }),
    "Failed to load FAQ details. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to fetch FAQ ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load FAQ details. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function createFaqAction(payload: CreateFaqPayload) {
  const auth = await requirePermission(
    "faqs.create",
    "You do not have permission to create FAQs."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.list, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Failed to create FAQ. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to create FAQ:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create FAQ. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "FAQ created successfully",
  };
}

export async function updateFaqAction(
  id: number | string,
  payload: UpdateFaqPayload
) {
  const auth = await requirePermission(
    "faqs.update",
    "You do not have permission to update FAQs."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<FaqItem>>(ENDPOINTS.faqs.byId(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Failed to update FAQ. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to update FAQ ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update FAQ. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "FAQ updated successfully",
  };
}

export async function deleteFaqAction(id: number | string) {
  const auth = await requirePermission(
    "faqs.delete",
    "You do not have permission to delete FAQs."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.faqs.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete FAQ. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to delete FAQ ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete FAQ. Please try again.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "FAQ deleted successfully",
  };
}
