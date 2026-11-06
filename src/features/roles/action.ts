"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  RoleItem,
  RolePageResponse,
  RolePermissionsData,
  RolePermissionsResponse,
  UpdateRolePermissionsPayload,
} from "./types";

export async function getRolesAction(params: {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RolePageResponse;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.read") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to view roles.",
    };
  }

  try {
    const page = params.page ? Math.max(0, params.page - 1) : 0;
    const size = params.size || 10;
    const sort = params.sort || "name,asc";
    const search = params.search ? encodeURIComponent(params.search.trim()) : "";

    const query = `?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}${
      search ? `&search=${search}` : ""
    }`;

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`/v1/roles${query}`, {
      method: "GET",
    });

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (err: unknown) {
    console.error("getRolesAction error:", err);
    if (err instanceof ApiError) {
      return {
        success: false,
        status: err.status,
        error: err.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to fetch roles",
    };
  }
}

export async function getRolePermissionsAction(roleId: number | string): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RolePermissionsData;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.read") &&
    !hasPermission(userPerms, "roles.permissions.manage") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to view role permissions.",
    };
  }

  try {
    const res = await apiFetch<RolePermissionsResponse>(
      `/v1/permissions/roles/${encodeURIComponent(roleId)}`,
      {
        method: "GET",
      }
    );

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (err: unknown) {
    console.error("getRolePermissionsAction error:", err);
    if (err instanceof ApiError) {
      return {
        success: false,
        status: err.status,
        error: err.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to fetch role permissions",
    };
  }
}

export async function updateRolePermissionsAction(
  roleId: number | string,
  payload: UpdateRolePermissionsPayload
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RolePermissionsData;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.permissions.manage") &&
    !hasPermission(userPerms, "roles.update") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to manage role permissions.",
    };
  }

  try {
    const res = await apiFetch<RolePermissionsResponse>(
      `/v1/permissions/roles/${encodeURIComponent(roleId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (err: unknown) {
    console.error("updateRolePermissionsAction error:", err);
    if (err instanceof ApiError) {
      return {
        success: false,
        status: err.status,
        error: err.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to update role permissions",
    };
  }
}


