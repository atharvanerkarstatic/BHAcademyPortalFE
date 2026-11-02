"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type { CityItem, SaveCityPayload } from "./types";

export async function getCitiesAction(): Promise<{
  success: boolean;
  data: CityItem[];
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["pincode.read", "system.all"])) {
    return {
      success: false,
      error: "You do not have permission to view cities.",
      data: [],
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: CityItem[];
    }>("/v1/city");

    return {
      success: true,
      data: Array.isArray(res?.data) ? res.data : [],
      message: res?.message,
    };
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    const message = error instanceof ApiError ? error.message : "Failed to load cities.";
    return {
      success: false,
      error: message,
      data: [],
    };
  }
}

export async function getCityByIdAction(id: number | string): Promise<{
  success: boolean;
  data?: CityItem;
  message?: string;
  error?: string;
}> {
  try {
    // Check single endpoint or fetch list
    const listRes = await getCitiesAction();
    if (listRes.success && listRes.data) {
      const found = listRes.data.find((c) => String(c.id) === String(id));
      if (found) {
        return {
          success: true,
          data: found,
          message: listRes.message,
        };
      }
    }

    // Direct endpoint fallback if available
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: CityItem;
    }>(`/v1/city/${encodeURIComponent(id)}`);

    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch city by id:", error);
    const message = error instanceof ApiError ? error.message : "Failed to load city details.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createCityAction(payload: SaveCityPayload): Promise<{
  success: boolean;
  data?: CityItem;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["pincode.create", "system.all"])) {
    return {
      success: false,
      error: "You do not have permission to create cities.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: CityItem;
    }>("/v1/city", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    revalidatePath("/cities");
    return {
      success: true,
      data: res.data,
      message: res.message || "City created successfully",
    };
  } catch (error) {
    console.error("Failed to create city:", error);
    const message = error instanceof ApiError ? error.message : "Failed to create city.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateCityAction(
  id: number | string,
  payload: SaveCityPayload
): Promise<{
  success: boolean;
  data?: CityItem;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["pincode.update", "system.all"])) {
    return {
      success: false,
      error: "You do not have permission to update cities.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: CityItem;
    }>(`/v1/city/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    revalidatePath("/cities");
    return {
      success: true,
      data: res.data,
      message: res.message || "City updated successfully",
    };
  } catch (error) {
    console.error("Failed to update city:", error);
    const message = error instanceof ApiError ? error.message : "Failed to update city.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteCityAction(id: number | string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["pincode.delete", "system.all"])) {
    return {
      success: false,
      error: "You do not have permission to delete cities.",
    };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
    }>(`/v1/city/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    revalidatePath("/cities");
    return {
      success: true,
      message: res.message || "PinCode record deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete city:", error);
    const message = error instanceof ApiError ? error.message : "Failed to delete city.";
    return {
      success: false,
      error: message,
    };
  }
}

