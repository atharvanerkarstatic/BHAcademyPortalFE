"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { refreshUserSessionAction } from "@/features/auth/action";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

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

export async function getRolesAction(
  params: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
  },
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RolePageResponse;
  error?: string;
}> {
  const auth = await requirePermission(
    ["roles.read", "system.all"],
    "You do not have permission to view roles."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const page = params.page ? Math.max(0, params.page - 1) : 0;
  const size = params.size || 10;
  const sort = params.sort || "name,asc";

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("size", String(size));
  queryParams.set("sort", sort);
  queryParams.set("search", params.search ? params.search.trim() : "");

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?${queryParams.toString()}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch roles"
  );

  if (!res.ok) {
    console.error("getRolesAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message,
    data: res.data.data,
  };
}

export async function getRolePermissionsAction(
  roleId: number | string,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RolePermissionsData;
  error?: string;
}> {
  const auth = await requirePermission(
    ["roles.read", "roles.permissions.manage", "system.all"],
    "You do not have permission to view role permissions."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<RolePermissionsResponse>(ENDPOINTS.roles.permissions(roleId), {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch role permissions"
  );

  if (!res.ok) {
    console.error("getRolePermissionsAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message,
    data: res.data.data,
  };
}

export async function getRoleByIdAction(
  roleId: number | string,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: RoleItem;
  error?: string;
}> {
  const auth = await requirePermission(
    ["roles.read", "roles.update", "system.all"],
    "You do not have permission to view this role."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  // Attempt 1: Fetch from roles list (GET /v1/roles?page=0&size=100&sort=name,asc&search=)
  // This endpoint returns full role details including description, code, isActive, isSystemRole
  const listRes = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?page=0&size=100&sort=name,asc&search=`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch roles"
  );

  if (listRes.ok) {
    const found = listRes.data.data?.content?.find(
      (r) => String(r.id) === String(roleId)
    );
    if (found) {
      return {
        success: true,
        status: 200,
        data: found,
      };
    }
  } else {
    console.warn(
      `GET /v1/roles lookup for role ${roleId} failed:`,
      listRes.error.cause
    );
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      status: 499,
      error: "Request aborted",
    };
  }

  // Attempt 2: Direct GET /v1/roles/:id (if supported in some environments)
  const detailRes = await tryCatch(
    apiFetch<RoleDetailResponse>(ENDPOINTS.roles.byId(roleId), {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch role"
  );

  if (detailRes.ok) {
    if (detailRes.data?.data) {
      return {
        success: detailRes.data.success ?? true,
        status: detailRes.data.status ?? 200,
        message: detailRes.data.message,
        data: detailRes.data.data,
      };
    }
  } else {
    const isMethodNotAllowed =
      (detailRes.error.isApiError &&
        (detailRes.error.status === 405 ||
          detailRes.error.message.toLowerCase().includes("not supported"))) ||
      detailRes.error.message.toLowerCase().includes("not supported");

    if (!isMethodNotAllowed) {
      console.warn(`GET /v1/roles/${roleId} failed:`, detailRes.error.cause);
    }
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      status: 499,
      error: "Request aborted",
    };
  }

  // Attempt 3: Fallback to role permissions endpoint GET /v1/permissions/roles/:roleId which has roleName, roleCode
  const permRes = await tryCatch(
    apiFetch<RolePermissionsResponse>(ENDPOINTS.roles.permissions(roleId), {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch role permissions"
  );

  if (permRes.ok) {
    if (permRes.data?.data) {
      const pData = permRes.data.data;
      return {
        success: true,
        status: 200,
        data: {
          id: pData.roleId || Number(roleId),
          name: pData.roleName || "",
          code: pData.roleCode || "",
          description: null,
          isActive: true,
          assignedPermissionsCount: pData.assignedCount,
        },
      };
    }
  } else {
    console.warn(
      `Fallback GET /v1/permissions/roles/${roleId} failed:`,
      permRes.error.cause
    );
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
  const auth = await requirePermission(
    ["roles.create", "system.all"],
    "You do not have permission to create roles."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<RoleDetailResponse>(ENDPOINTS.roles.list, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }),
    "Failed to create role"
  );

  if (!res.ok) {
    console.error("createRoleAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 201,
    message: res.data.message || "Role created successfully",
    data: res.data.data,
  };
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
  const auth = await requirePermission(
    ["roles.update", "system.all"],
    "You do not have permission to update roles."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<RoleDetailResponse>(ENDPOINTS.roles.byId(roleId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }),
    "Failed to update role"
  );

  if (!res.ok) {
    console.error("updateRoleAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  // Refresh current user session tokens in case active role/permissions were affected
  const refreshRes = await tryCatch(refreshUserSessionAction());
  if (!refreshRes.ok) {
    console.warn(
      "Session auto-refresh after role update:",
      refreshRes.error.cause
    );
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message || "Role updated successfully",
    data: res.data.data,
  };
}

export async function deleteRoleAction(roleId: number | string): Promise<{
  success: boolean;
  status: number;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["roles.delete", "system.all"],
    "You do not have permission to delete roles."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message?: string;
    }>(ENDPOINTS.roles.byId(roleId), {
      method: "DELETE",
    }),
    "Failed to delete role"
  );

  if (!res.ok) {
    console.error("deleteRoleAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data?.success ?? true,
    status: res.data?.status ?? 200,
    message: res.data?.message || "Role deleted successfully",
  };
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
  const auth = await requirePermission(
    ["roles.permissions.manage", "roles.update", "system.all"],
    "You do not have permission to manage role permissions."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<RolePermissionsResponse>(ENDPOINTS.roles.permissions(roleId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }),
    "Failed to update role permissions"
  );

  if (!res.ok) {
    console.error("updateRolePermissionsAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  // Refresh current user session tokens to immediately decode updated auth array
  const refreshRes = await tryCatch(refreshUserSessionAction());
  if (!refreshRes.ok) {
    console.warn(
      "Session auto-refresh after role permissions update:",
      refreshRes.error.cause
    );
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message,
    data: res.data.data,
  };
}
