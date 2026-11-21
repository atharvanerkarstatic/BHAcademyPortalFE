"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  AdminUserItem,
  AdminUserPageResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  RolePageResponse,
  RoleItem,
} from "./types";

export interface GetAdminUsersParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}

export async function getAdminUsersAction(
  params: GetAdminUsersParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    ["users.read", "system.all"],
    "You do not have permission to view users."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<AdminUserItem>(
        params.size ?? 10
      ) satisfies AdminUserPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort: params.sort || "id,desc",
  });

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserPageResponse;
    }>(`${ENDPOINTS.users.list}?${searchParams.toString()}`, {
      signal: options?.signal,
    }),
    "Failed to load admin users."
  );

  if (!res.ok) {
    console.error("Failed to fetch admin users:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load admin users.",
      data: createEmptyPage<AdminUserItem>(
        size
      ) satisfies AdminUserPageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
  };
}

export async function getAdminUserByIdAction(
  id: string | number,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    ["users.read", "system.all"],
    "You do not have permission to view user details."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(ENDPOINTS.users.byId(id), {
      signal: options?.signal,
    }),
    "Failed to load user details."
  );

  if (!res.ok) {
    console.error(`Failed to fetch user ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load user details.",
    };
  }

  return {
    success: true,
    data: res.data.data,
  };
}

export async function createAdminUserAction(payload: CreateAdminUserPayload) {
  const auth = await requirePermission(
    ["users.create", "system.all"],
    "You do not have permission to create users."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    departmentId: payload.departmentId || null,
    roleIds: payload.roleIds,
    mobileNumber: payload.mobileNumber || null,
    profilePic: payload.profilePic || null,
    pinCode: payload.pinCode || payload.pincode || "",
  };

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(ENDPOINTS.users.list, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    "Failed to create user."
  );

  if (!res.ok) {
    console.error("Failed to create admin user:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create user.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "User created successfully",
  };
}

function resolvePinCode(payload: {
  pinCode?: string | null;
  pincode?: string | null;
}): string | null {
  if (payload.pinCode !== undefined) {
    return payload.pinCode;
  }
  if (payload.pincode !== undefined) {
    return payload.pincode;
  }
  return "";
}

export async function updateAdminUserAction(
  id: string | number,
  payload: UpdateAdminUserPayload
) {
  const auth = await requirePermission(
    ["users.update", "system.all"],
    "You do not have permission to update users."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    departmentId: payload.departmentId || null,
    mobileNumber: payload.mobileNumber || null,
    profilePic: payload.profilePic ?? null,
    roleIds: payload.roleIds,
    pinCode: resolvePinCode(payload),
  };

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(ENDPOINTS.users.byId(id), {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    "Failed to update user."
  );

  if (!res.ok) {
    console.error(`Failed to update user ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update user.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "User updated successfully",
  };
}

export async function resetUserPasswordAction(
  id: string | number,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const auth = await requirePermission(
    ["users.update", "system.all"],
    "You do not have permission to reset user passwords."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data?: { message?: string };
    }>(ENDPOINTS.users.resetPassword(id), {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
    "Failed to reset password."
  );

  if (!res.ok) {
    console.error(`Failed to reset password for user ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to reset password.",
    };
  }

  return {
    success: true,
    message:
      res.data.message ||
      res.data.data?.message ||
      "User password reset successfully",
  };
}

export async function updateAdminUserStatusAction(
  id: string | number,
  status: "ACTIVE" | "SUSPENDED" | "DELETED"
) {
  const auth = await requirePermission(
    ["users.update", "system.all"],
    "You do not have permission to update user status."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AdminUserItem;
    }>(ENDPOINTS.users.status(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
    "Failed to update user status."
  );

  if (!res.ok) {
    console.error(`Failed to update user status ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update user status.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || `User status changed to ${status}`,
  };
}

export async function deleteAdminUserAction(id: string | number) {
  const auth = await requirePermission(
    ["users.delete", "system.all"],
    "You do not have permission to delete users."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
    }>(ENDPOINTS.users.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete user."
  );

  if (!res.ok) {
    console.error(`Failed to delete user ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete user.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "User archived successfully",
  };
}

export async function getRolesPicklistAction(
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: Array<RoleItem>;
  error?: string;
}> {
  const auth = await requirePermission(
    ["roles.read", "users.create", "users.update", "system.all"],
    "You do not have permission to load roles."
  );
  if (!auth.ok) {
    return {
      success: false,
      data: [],
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?page=0&size=100&sort=name,asc&search=`, {
      signal: options?.signal,
    }),
    "Failed to load roles."
  );

  if (!res.ok) {
    console.error("Failed to fetch roles picklist:", res.error.cause);
    return {
      success: false,
      data: [],
      error: res.error.isApiError ? res.error.message : "Failed to load roles.",
    };
  }

  return {
    success: true,
    data: res.data.data?.content || [],
  };
}
