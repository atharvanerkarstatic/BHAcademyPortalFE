"use server";

import { ENDPOINTS } from "@/config/endpoints";
import type { RolePageResponse } from "@/features/roles/types";
import { apiFetch, apiFetchText } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage } from "@/lib/type-guards";

import type {
  TrainerItem,
  TrainerPageResponse,
  CreateTrainerPayload,
  UpdateTrainerPayload,
} from "./types";

export interface GetTrainersParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
}

export async function getTrainersAction(
  params: GetTrainersParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    ["users.read", "system.all"],
    "You do not have permission to view trainers."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<TrainerItem>(
        params.size ?? 10
      ) satisfies TrainerPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort: params.sort || "",
    userType: "TRAINER",
  });

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerPageResponse;
    }>(`${ENDPOINTS.users.list}?${searchParams.toString()}`, {
      signal: options?.signal,
    }),
    "Failed to load trainers. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to fetch trainers:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load trainers. Please try again.",
      data: createEmptyPage<TrainerItem>(size) satisfies TrainerPageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Trainers retrieved successfully",
  };
}

export async function getTrainerByIdAction(
  id: number | string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    ["users.read", "system.all"],
    "You do not have permission to view trainer details."
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
      data: TrainerItem;
    }>(ENDPOINTS.users.byId(id), {
      signal: options?.signal,
    }),
    "Failed to load trainer details."
  );

  if (!res.ok) {
    console.error(`Failed to fetch trainer ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load trainer details.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function createTrainerAction(payload: CreateTrainerPayload) {
  const auth = await requirePermission(
    ["users.create", "system.all"],
    "You do not have permission to create trainers."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const query = new URLSearchParams({
    page: "0",
    size: "20",
    sort: "name,asc",
    search: "TRAINER",
  });
  const rolesRes = await tryCatch(
    apiFetch<{
      success: boolean;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?${query.toString()}`),
    "Failed to create trainer. Please try again."
  );

  if (!rolesRes.ok) {
    console.error("Failed to create trainer:", rolesRes.error.cause);
    return {
      success: false,
      error: rolesRes.error.isApiError
        ? rolesRes.error.message
        : "Failed to create trainer. Please try again.",
    };
  }

  if (!rolesRes.data.success) {
    return {
      success: false,
      error:
        rolesRes.data.message ||
        "Failed to load the trainer role. Please try again.",
    };
  }

  const trainerRole = rolesRes.data.data?.content?.find(
    (role) => role.code === "TRAINER" && role.isActive === true
  );

  if (!trainerRole || trainerRole.id === null || trainerRole.id === undefined) {
    return {
      success: false,
      error: "Trainer role not found. Contact your administrator.",
    };
  }

  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    departmentId: payload.departmentId || null,
    mobileNumber: payload.mobileNumber,
    profilePic: payload.profilePic,
    roleIds: [String(trainerRole.id)],
    pinCode: payload.pinCode || payload.pincode || "",
  };

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerItem;
    }>(ENDPOINTS.users.list, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    "Failed to create trainer. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to create trainer:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create trainer. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "User created successfully",
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

export async function updateTrainerAction(
  id: number | string,
  payload: UpdateTrainerPayload
) {
  const auth = await requirePermission(
    ["users.update", "system.all"],
    "You do not have permission to update trainers."
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
    profilePic: payload.profilePic ?? null,
    mobileNumber: payload.mobileNumber,
    pinCode: resolvePinCode(payload),
  };

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerItem;
    }>(ENDPOINTS.users.byId(id), {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    "Failed to update trainer. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to update trainer ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update trainer. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "User updated successfully",
  };
}

export async function updateTrainerStatusAction(
  id: number | string,
  status: string
) {
  const auth = await requirePermission(
    ["users.update", "system.all"],
    "You do not have permission to update trainer status."
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
      data?: unknown;
    }>(ENDPOINTS.users.status(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
    "Failed to update trainer status."
  );

  if (!res.ok) {
    console.error(
      `Failed to update status for trainer ${id}:`,
      res.error.cause
    );
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update trainer status.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || `Trainer status updated to ${status}`,
  };
}

export async function deleteTrainerAction(id: number | string) {
  const auth = await requirePermission(
    ["users.delete", "system.all"],
    "You do not have permission to delete trainers."
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
    "Failed to delete trainer."
  );

  if (!res.ok) {
    console.error(`Failed to delete trainer ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete trainer.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Trainer deleted successfully",
  };
}

export async function exportTrainersAction() {
  const auth = await requirePermission(
    ["users.read", "system.all"],
    "You do not have permission to export trainers."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetchText(ENDPOINTS.users.exportTrainers, {}, "text/csv"),
    "Failed to export trainers."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.message,
    };
  }

  return {
    success: true,
    data: res.data.text,
    filename: `trainers_export_${new Date().toISOString().slice(0, 10)}.csv`,
    message: "Trainers exported successfully",
  };
}
