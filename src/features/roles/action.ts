"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import { refreshUserSessionAction } from "@/features/auth/action";
import type {
  RoleDetailResponse,
  RoleItem,
  RolePageResponse,
  RolePermissionsData,
  RolePermissionsResponse,
  UpdateRolePayload,
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

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("size", String(size));
    queryParams.set("sort", sort);
    queryParams.set("search", params.search ? params.search.trim() : "");

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`/v1/roles?${queryParams.toString()}`, {
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

export async function getRoleByIdAction(roleId: number | string): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RoleItem;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.read") &&
    !hasPermission(userPerms, "roles.update") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to view this role.",
    };
  }

  try {
    const res = await apiFetch<RoleDetailResponse>(
      `/v1/roles/${encodeURIComponent(roleId)}`,
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
    console.error("getRoleByIdAction error:", err);
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
      error: err instanceof Error ? err.message : "Failed to fetch role details",
    };
  }
}

export async function updateRoleAction(
  roleId: number | string,
  payload: UpdateRolePayload
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RoleItem;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.update") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to update roles.",
    };
  }

  try {
    const res = await apiFetch<RoleDetailResponse>(
      `/v1/roles/${encodeURIComponent(roleId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    // Refresh current user session tokens in case active role/permissions were affected
    try {
      await refreshUserSessionAction();
    } catch (refErr) {
      console.warn("Session auto-refresh after role update:", refErr);
    }

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message || "Role updated successfully",
      data: res.data,
    };
  } catch (err: unknown) {
    console.error("updateRoleAction error:", err);
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
      error: err instanceof Error ? err.message : "Failed to update role",
    };
  }
}

export async function deleteRoleAction(roleId: number | string): Promise<{
  success: boolean;
  status: number;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.delete") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to delete roles.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message?: string;
    }>(`/v1/roles/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    });

    return {
      success: res?.success ?? true,
      status: res?.status ?? 200,
      message: res?.message || "Role deleted successfully",
    };
  } catch (err: unknown) {
    console.error("deleteRoleAction error:", err);
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
      error: err instanceof Error ? err.message : "Failed to delete role",
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

    // Refresh current user session tokens to immediately decode updated auth array
    try {
      await refreshUserSessionAction();
    } catch (refErr) {
      console.warn("Session auto-refresh after role permissions update:", refErr);
    }

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


