"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

import type { CityItem, SaveCityPayload } from "./types";

export async function getCitiesAction(options?: ActionRequestOptions): Promise<{
  success: boolean;
  data: Array<CityItem>;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["pincode.read", "system.all"],
    "You do not have permission to view cities."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [],
    };
  }

  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: Array<CityItem>;
    }>(ENDPOINTS.cities.list, { signal: options?.signal }),
    "Failed to load cities."
  );

  if (!res.ok) {
    console.error("Failed to fetch cities:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load cities.",
      data: [],
    };
  }

  return {
    success: true,
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    message: res.data?.message,
  };
}

export async function getCityByIdAction(
  id: number | string,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data?: CityItem;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["pincode.read", "system.all"],
    "You do not have permission to view city details."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  // Check single endpoint or fetch list
  const listRes = await getCitiesAction(options);
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

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load city details.",
    };
  }

  // Direct endpoint fallback if available
  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: CityItem;
    }>(ENDPOINTS.cities.byId(id), { signal: options?.signal }),
    "Failed to load city details."
  );

  if (!res.ok) {
    console.error("Failed to fetch city by id:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load city details.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function createCityAction(payload: SaveCityPayload): Promise<{
  success: boolean;
  data?: CityItem;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["pincode.create", "system.all"],
    "You do not have permission to create cities."
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
      data: CityItem;
    }>(ENDPOINTS.cities.list, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Failed to create city."
  );

  if (!res.ok) {
    console.error("Failed to create city:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create city.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "City created successfully",
  };
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
  const auth = await requirePermission(
    ["pincode.update", "system.all"],
    "You do not have permission to update cities."
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
      data: CityItem;
    }>(ENDPOINTS.cities.byId(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Failed to update city."
  );

  if (!res.ok) {
    console.error("Failed to update city:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update city.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "City updated successfully",
  };
}

export async function deleteCityAction(id: number | string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["pincode.delete", "system.all"],
    "You do not have permission to delete cities."
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
    }>(ENDPOINTS.cities.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete city."
  );

  if (!res.ok) {
    console.error("Failed to delete city:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete city.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "PinCode record deleted successfully",
  };
}
