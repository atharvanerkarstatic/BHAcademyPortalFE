"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import { refreshUserSessionAction } from "@/features/auth/action";
import type {
  CreateRolePayload,
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
    }>(`${ENDPOINTS.roles.list}?${queryParams.toString()}`, {
      method: "GET",
    });

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("getRolesAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch roles",
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
      ENDPOINTS.roles.permissions(roleId),
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
  } catch (error: unknown) {
    console.error("getRolePermissionsAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch role permissions",
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

  // Attempt 1: Fetch from roles list (GET /v1/roles?page=0&size=100&sort=name,asc&search=)
  // This endpoint returns full role details including description, code, isActive, isSystemRole
  try {
    const listRes = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?page=0&size=100&sort=name,asc&search=`, {
      method: "GET",
    });

    const found = listRes.data?.content?.find((r) => String(r.id) === String(roleId));
    if (found) {
      return {
        success: true,
        status: 200,
        data: found,
      };
    }
  } catch (error) {
    console.warn(`GET /v1/roles lookup for role ${roleId} failed:`, error);
  }

  // Attempt 2: Direct GET /v1/roles/:id (if supported in some environments)
  try {
    const res = await apiFetch<RoleDetailResponse>(
      ENDPOINTS.roles.byId(roleId),
      {
        method: "GET",
      }
    );

    if (res?.data) {
      return {
        success: res.success ?? true,
        status: res.status ?? 200,
        message: res.message,
        data: res.data,
      };
    }
  } catch (error: unknown) {
    const isMethodNotAllowed =
      (error instanceof ApiError && (error.status === 405 || error.message?.toLowerCase().includes("not supported"))) ||
      (error instanceof Error && error.message?.toLowerCase().includes("not supported"));

    if (!isMethodNotAllowed) {
      console.warn(`GET /v1/roles/${roleId} failed:`, error);
    }
  }

  // Attempt 3: Fallback to role permissions endpoint GET /v1/permissions/roles/:roleId which has roleName, roleCode
  try {
    const permRes = await apiFetch<RolePermissionsResponse>(
      ENDPOINTS.roles.permissions(roleId),
      {
        method: "GET",
      }
    );

    if (permRes?.data) {
      const pData = permRes.data;
      return {
        success: true,
        status: 200,
        data: {
          id: Number(pData.roleId) || Number(roleId),
          name: pData.roleName || "",
          code: pData.roleCode || "",
          description: null,
          isActive: true,
          assignedPermissionsCount: pData.assignedCount,
        },
      };
    }
  } catch (error) {
    console.warn(`Fallback GET /v1/permissions/roles/${roleId} failed:`, error);
  }

  return {
    success: false,
    status: 404,
    error: "Role not found",
  };
}

export async function createRoleAction(payload: CreateRolePayload): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RoleItem;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "roles.create") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to create roles.",
    };
  }

  try {
    const res = await apiFetch<RoleDetailResponse>(ENDPOINTS.roles.list, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    return {
      success: res.success ?? true,
      status: res.status ?? 201,
      message: res.message || "Role created successfully",
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("createRoleAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to create role",
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
      ENDPOINTS.roles.byId(roleId),
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
    } catch (error) {
      console.warn("Session auto-refresh after role update:", error);
    }

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message || "Role updated successfully",
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("updateRoleAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to update role",
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
    }>(ENDPOINTS.roles.byId(roleId), {
      method: "DELETE",
    });

    return {
      success: res?.success ?? true,
      status: res?.status ?? 200,
      message: res?.message || "Role deleted successfully",
    };
  } catch (error: unknown) {
    console.error("deleteRoleAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to delete role",
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
      ENDPOINTS.roles.permissions(roleId),
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
    } catch (error) {
      console.warn("Session auto-refresh after role permissions update:", error);
    }

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("updateRolePermissionsAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to update role permissions",
    };
  }
}


