"use server";

import { revalidatePath } from "next/cache";
import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, apiFetchText, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type { RolePageResponse } from "@/features/roles/types";
import type {
  TrainerItem,
  TrainerPageResponse,
  CreateTrainerPayload,
  UpdateTrainerPayload,
} from "./types";

export type GetTrainersParams = {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
};

export async function getTrainersAction(params: GetTrainersParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view trainers.",
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
      } as TrainerPageResponse,
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

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerPageResponse;
    }>(`${ENDPOINTS.users.list}?${searchParams.toString()}`);

    return {
      success: true,
      data: res.data,
      message: res.message || "Trainers retrieved successfully",
    };
  } catch (error) {
    console.error("Failed to fetch trainers:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load trainers. Please try again.";
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
      } as TrainerPageResponse,
    };
  }
}

export async function getTrainerByIdAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view trainer details.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerItem;
    }>(ENDPOINTS.users.byId(id));

    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch trainer ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load trainer details.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createTrainerAction(payload: CreateTrainerPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.create") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to create trainers.",
    };
  }

  try {
    const query = new URLSearchParams({
      page: "0",
      size: "20",
      sort: "name,asc",
      search: "TRAINER",
    });
    const rolesRes = await apiFetch<{
      success: boolean;
      message: string;
      data: RolePageResponse;
    }>(`${ENDPOINTS.roles.list}?${query.toString()}`);

    if (!rolesRes.success) {
      return {
        success: false,
        error: rolesRes.message || "Failed to load the trainer role. Please try again.",
      };
    }

    const trainerRole = rolesRes.data?.content?.find(
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

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerItem;
    }>(ENDPOINTS.users.list, {
      method: "POST",
      body: JSON.stringify(body),
    });

    revalidatePath("/trainers");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "User created successfully",
    };
  } catch (error) {
    console.error("Failed to create trainer:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create trainer. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTrainerAction(id: number | string, payload: UpdateTrainerPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to update trainers.",
    };
  }

  try {
    const body = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      departmentId: payload.departmentId || null,
      profilePic: payload.profilePic ?? null,
      mobileNumber: payload.mobileNumber,
      pinCode: payload.pinCode !== undefined ? payload.pinCode : payload.pincode !== undefined ? payload.pincode : "",
    };

    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainerItem;
    }>(ENDPOINTS.users.byId(id), {
      method: "PUT",
      body: JSON.stringify(body),
    });

    revalidatePath(`/trainers/${id}/edit`);
    revalidatePath("/trainers");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "User updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update trainer ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update trainer. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTrainerStatusAction(
  id: number | string,
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | string
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.update") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to update trainer status.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data?: unknown;
    }>(ENDPOINTS.users.status(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    revalidatePath("/trainers");

    return {
      success: true,
      data: res?.data,
      message: res?.message || `Trainer status updated to ${status}`,
    };
  } catch (error) {
    console.error(`Failed to update status for trainer ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update trainer status.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteTrainerAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.delete") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to delete trainers.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
    }>(ENDPOINTS.users.byId(id), {
      method: "DELETE",
    });

    revalidatePath("/trainers");

    return {
      success: true,
      message: res?.message || "Trainer deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete trainer ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete trainer.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function exportTrainersAction() {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "users.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to export trainers.",
    };
  }

  try {
    const { text } = await apiFetchText(ENDPOINTS.users.exportTrainers, {}, "text/csv");

    return {
      success: true,
      data: text,
      filename: `trainers_export_${new Date().toISOString().slice(0, 10)}.csv`,
      message: "Trainers exported successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export trainers.",
    };
  }
}
