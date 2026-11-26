"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  TrainingMasterItem,
  TrainingMasterPageResponse,
  CreateTrainingMasterPayload,
  UpdateTrainingMasterPayload,
} from "./types";

export type GetTrainingMastersParams = {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  topicId?: string;
  pincodeId?: string;
  fromDate?: string;
  toDate?: string;
  languageCode?: string;
};

export async function getTrainingMastersAction(params: GetTrainingMastersParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "training-master.read",
      "training-master.manage",
      "users.read",
      "ROLE_TRAINER",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to view training master records.",
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
      } as TrainingMasterPageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    search: params.search ?? "",
    status: params.status ?? "",
    topicId: params.topicId ?? "",
    pincodeId: params.pincodeId ?? "",
    fromDate: params.fromDate ?? "",
    toDate: params.toDate ?? "",
    languageCode: params.languageCode ?? "",
  });

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainingMasterPageResponse;
    }>(`/v1/training-master?${searchParams.toString()}`);

    return {
      success: true,
      data: res.data,
      message: res.message || "Training masters fetched successfully",
    };
  } catch (error) {
    console.error("Failed to fetch training masters:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load training masters. Please try again.";
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
      } as TrainingMasterPageResponse,
    };
  }
}

export async function getTrainingMasterByIdAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "training-master.read",
      "training-master.manage",
      "users.read",
      "ROLE_TRAINER",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to view this training master.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainingMasterItem;
    }>(`/v1/training-master/${id}`);

    return {
      success: true,
      data: res.data,
      message: res.message || "Training master retrieved successfully",
    };
  } catch (error) {
    console.error(`Failed to fetch training master ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load training master. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createTrainingMasterAction(payload: CreateTrainingMasterPayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "training-master.create",
      "training-master.manage",
      "users.create",
      "ROLE_TRAINER",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to create training master records.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainingMasterItem;
    }>("/v1/training-master", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    revalidatePath("/training-master");

    return {
      success: true,
      data: res.data,
      message: res.message || "Training master created successfully",
    };
  } catch (error) {
    console.error("Failed to create training master:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create training master. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTrainingMasterAction(
  id: number | string,
  payload: UpdateTrainingMasterPayload
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "training-master.update",
      "training-master.manage",
      "users.update",
      "ROLE_TRAINER",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to update training master records.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: TrainingMasterItem;
    }>(`/v1/training-master/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    revalidatePath("/training-master");
    revalidatePath(`/training-master/${id}`);

    return {
      success: true,
      data: res.data,
      message: res.message || "Training master updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update training master ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update training master. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteTrainingMasterAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "training-master.delete",
      "training-master.manage",
      "users.delete",
      "ROLE_TRAINER",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to delete training master records.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
    }>(`/v1/training-master/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/training-master");

    return {
      success: true,
      message: res.message || "Training master deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete training master ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete training master. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
