"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  ApiResponse,
  CategoryItem,
  CategoryPageResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./types";

export interface GetCategoriesParams {
  page?: number;
  size?: number;
  sort?: "asc" | "desc";
  status?: string | null;
}

function sanitizePayload(
  payload: CreateCategoryPayload
): CreateCategoryPayload {
  const sanitized: CreateCategoryPayload = {
    category: payload.category.trim(),
    displayOrder:
      typeof payload.displayOrder === "number" ? payload.displayOrder : 0,
    status: payload.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    featured: payload.featured,
  };

  // Clean imageUrl: trim whitespace and newlines, or omit if empty
  if (typeof payload.imageUrl === "string") {
    const cleaned = payload.imageUrl.replaceAll(/[\r\n\t]/gu, "").trim();
    if (cleaned) {
      sanitized.imageUrl = cleaned;
    }
  }

  // Sanitize translation fields
  const transKeys = [
    "categoryAs",
    "categoryBn",
    "categoryGu",
    "categoryHi",
    "categoryKn",
    "categoryMl",
    "categoryMr",
    "categoryOr",
    "categoryTa",
    "categoryTe",
  ] as const;

  for (const key of transKeys) {
    const val = payload[key];
    if (typeof val === "string") {
      sanitized[key] = val.trim();
    }
  }

  return sanitized;
}

export async function getCategoriesAction(
  params: GetCategoriesParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "categories.read",
    "You do not have permission to view categories."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<CategoryItem>(
        params.size ?? 0
      ) satisfies CategoryPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const sort = params.sort ?? "asc";

  // Spring Pageable is 0-indexed
  const apiPage = Math.max(page - 1, 0);

  const query = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort,
  });

  if (params.status) {
    query.set("status", params.status);
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CategoryPageResponse>>(
      `${ENDPOINTS.categories.list}?${query.toString()}`,
      { signal: options?.signal }
    ),
    "Failed to load categories. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to fetch categories:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load categories. Please try again.",
      data: createEmptyPage<CategoryItem>(size) satisfies CategoryPageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function getCategoryByIdAction(
  id: string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "categories.read",
    "You do not have permission to view this category."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  // Note: /v1/category/{id} is removed on backend; fetch from the category list endpoint
  const res = await tryCatch(
    apiFetch<ApiResponse<CategoryPageResponse>>(
      `${ENDPOINTS.categories.list}?page=0&size=200`,
      { signal: options?.signal }
    ),
    "Failed to load category details. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to fetch category ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load category details. Please try again.",
    };
  }

  const found = res.data?.data?.content?.find(
    (item) => String(item.categoryId) === id
  );
  if (found) {
    return {
      success: true,
      data: found,
    };
  }

  return {
    success: false,
    error: `Category ${id} not found.`,
  };
}

export async function createCategoryAction(payload: CreateCategoryPayload) {
  const auth = await requirePermission(
    "categories.create",
    "You do not have permission to create categories."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const cleanPayload = sanitizePayload(payload);

  const res = await tryCatch(
    apiFetch<ApiResponse<CategoryItem>>(ENDPOINTS.categories.list, {
      method: "POST",
      body: JSON.stringify(cleanPayload),
    }),
    "Failed to create category. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to create category:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create category. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Category created successfully",
  };
}

export async function updateCategoryAction(
  id: string,
  payload: UpdateCategoryPayload
) {
  const auth = await requirePermission(
    "categories.update",
    "You do not have permission to update categories."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const cleanPayload = sanitizePayload(payload);

  const res = await tryCatch(
    apiFetch<ApiResponse<CategoryItem>>(ENDPOINTS.categories.byId(id), {
      method: "PUT",
      body: JSON.stringify(cleanPayload),
    }),
    "Failed to update category. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to update category ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update category. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Category updated successfully",
  };
}

export async function deleteCategoryAction(id: string) {
  const auth = await requirePermission(
    "categories.delete",
    "You do not have permission to delete categories."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.categories.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete category. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to delete category ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete category. Please try again.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Category deleted successfully",
  };
}
