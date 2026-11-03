"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  AdminUserItem,
  AdminUserPageResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  RolePageResponse,
  RoleItem,
} from "./types";

export type GetAdminUsersParams = {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
};

export async function getAdminUsersAction(params: GetAdminUsersParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view users.",
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
      } as AdminUserPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort: params.sort || "",
  });

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserPageResponse;
    }>(`/v1/users?${searchParams.toString()}`);

    return {
      success: true,
      data: res.data,
      message: res.message || "Users retrieved successfully",
    };
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load admin users. Please try again.";
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
      } as AdminUserPageResponse,
    };
  }
}

export async function getAdminUserByIdAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view user details.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(`/v1/users/${id}`);

    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch user ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load user details.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createAdminUserAction(payload: CreateAdminUserPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.create") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to create users.",
    };
  }

  try {
    const body: Record<string, unknown> = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      departmentId: payload.departmentId || null,
      roleIds: payload.roleIds,
    };

    if (payload.mobileNumber !== undefined) {
      body.mobileNumber = payload.mobileNumber;
    }
    if (payload.profilePic !== undefined) {
      body.profilePic = payload.profilePic;
    }

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>("/v1/users", {
      method: "POST",
      body: JSON.stringify(body),
    });

    revalidatePath("/admin-users");
    revalidatePath("/users");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "User created successfully",
    };
  } catch (error) {
    console.error("Failed to create admin user:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create user. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateAdminUserAction(
  id: number | string,
  payload: UpdateAdminUserPayload
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to update users.",
    };
  }

  try {
    const body: Record<string, unknown> = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      departmentId: payload.departmentId || null,
      mobileNumber: payload.mobileNumber ?? null,
      profilePic: payload.profilePic ?? null,
    };

    if (payload.roleIds && payload.roleIds.length > 0) {
      body.roleIds = payload.roleIds;
    }

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(`/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    revalidatePath(`/admin-users/${id}/edit`);
    revalidatePath("/admin-users");
    revalidatePath("/users");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "User updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update user ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update user. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateAdminUserStatusAction(
  id: number | string,
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | string
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to update user status.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data?: unknown;
    }>(`/v1/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    revalidatePath("/admin-users");
    revalidatePath("/users");

    return {
      success: true,
      data: res?.data,
      message: res?.message || `User status updated to ${status}`,
    };
  } catch (error) {
    console.error(`Failed to update status for user ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update user status.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteAdminUserAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.delete") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to delete users.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
    }>(`/v1/users/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/admin-users");
    revalidatePath("/users");

    return {
      success: true,
      message: res?.message || "User archived successfully",
    };
  } catch (error) {
    console.error(`Failed to delete user ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete user.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getRolesPicklistAction(): Promise<{
  success: boolean;
  data: RoleItem[];
  error?: string;
}> {
  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>("/v1/roles?page=0&size=100&sort=name,asc");

    return {
      success: true,
      data: res.data?.content || [],
    };
  } catch (error) {
    console.error("Failed to fetch roles picklist:", error);
    return {
      success: false,
      data: [],
      error: error instanceof ApiError ? error.message : "Failed to load roles.",
    };
  }
}

