"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  ApiResponse,
  CategoryItem,
  CategoryPageResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./types";

export type GetCategoriesParams = {
  page?: number;
  size?: number;
  sort?: "asc" | "desc";
};

function sanitizePayload<T extends CreateCategoryPayload | UpdateCategoryPayload>(payload: T): T {
  const sanitized: Record<string, unknown> = {
    category: payload.category.trim(),
    displayOrder: typeof payload.displayOrder === "number" ? payload.displayOrder : 0,
    status: payload.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    featured: Boolean(payload.featured),
  };

  // Clean imageUrl: trim whitespace and newlines, or omit if empty
  if (typeof payload.imageUrl === "string") {
    const cleaned = payload.imageUrl.replace(/[\r\n\t]/g, "").trim();
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
    const val = (payload as Record<string, unknown>)[key];
    if (typeof val === "string") {
      sanitized[key] = val.trim();
    }
  }

  return sanitized as T;
}

export async function getCategoriesAction(params: GetCategoriesParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "categories.read")) {
    return {
      success: false,
      error: "You do not have permission to view categories.",
      data: {
        content: [],
        page: 1,
        size: params.size ?? 0,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      } as CategoryPageResponse,
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

  try {
    const res = await apiFetch<ApiResponse<CategoryPageResponse>>(`/v1/category?${query.toString()}`);
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load categories. Please try again.";
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
      } as CategoryPageResponse,
    };
  }
}

export async function getCategoryByIdAction(id: string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "categories.read")) {
    return {
      success: false,
      error: "You do not have permission to view this category.",
    };
  }

  try {
    // Note: /v1/category/{id} is removed on backend; fetch from the category list endpoint
    const listRes = await apiFetch<ApiResponse<CategoryPageResponse>>("/v1/category?page=0&size=200");
    const found = listRes?.data?.content?.find((item) => String(item.categoryId) === String(id));
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
  } catch (error) {
    console.error(`Failed to fetch category ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load category details. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createCategoryAction(payload: CreateCategoryPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "categories.create")) {
    return {
      success: false,
      error: "You do not have permission to create categories.",
    };
  }

  const cleanPayload = sanitizePayload(payload);

  try {
    const res = await apiFetch<ApiResponse<CategoryItem>>("/v1/category", {
      method: "POST",
      body: JSON.stringify(cleanPayload),
    });

    revalidatePath("/categories");

    return {
      success: true,
      data: res.data,
      message: res.message || "Category created successfully",
    };
  } catch (error) {
    console.error("Failed to create category:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create category. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateCategoryAction(id: string, payload: UpdateCategoryPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "categories.update")) {
    return {
      success: false,
      error: "You do not have permission to update categories.",
    };
  }

  const cleanPayload = sanitizePayload(payload);

  try {
    const res = await apiFetch<ApiResponse<CategoryItem>>(`/v1/category/${id}`, {
      method: "PUT",
      body: JSON.stringify(cleanPayload),
    });

    revalidatePath("/categories");

    return {
      success: true,
      data: res.data,
      message: res.message || "Category updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update category ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update category. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteCategoryAction(id: string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "categories.delete")) {
    return {
      success: false,
      error: "You do not have permission to delete categories.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<void>>(`/v1/category/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/categories");

    return {
      success: true,
      message: res?.message || "Category deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete category ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete category. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
