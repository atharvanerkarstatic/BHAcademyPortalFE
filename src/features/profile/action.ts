"use server";

import { cookies } from "next/headers";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { ALL_AUTH_COOKIES } from "@/lib/auth-cookies";
import { getCurrentUser } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

export interface UserProfile {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId?: string;
  mobileNumber?: string;
  profilePic?: string | null;
  status?: string;
  roles?: Array<{ id: number; code: string; name: string }>;
}

export interface UpdateUserProfilePayload {
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  profilePic: string | null;
  mobileNumber?: string;
}

export async function getCurrentUserProfile(
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "User session not found." };
  }

  const res = await tryCatch(
    apiFetch<{ success: boolean; data: UserProfile; message?: string }>(
      ENDPOINTS.users.byId(user.id),
      { signal: options?.signal }
    ),
    "Failed to load user profile."
  );

  if (!res.ok) {
    console.error("Failed to load user profile:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load user profile.",
    };
  }

  return {
    success: true,
    data: res.data.data,
  };
}

export async function updateUserProfileAction(
  payload: UpdateUserProfilePayload
): Promise<{
  success: boolean;
  data?: UserProfile;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return {
      success: false,
      error: "User session not found. Please log in again.",
    };
  }

  const res = await tryCatch(
    apiFetch<{ success: boolean; data: UserProfile; message?: string }>(
      ENDPOINTS.users.byId(user.id),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),
    "Failed to update profile."
  );

  if (!res.ok) {
    console.error("Failed to update user profile:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update profile.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "User updated successfully",
  };
}

export async function changePasswordAction(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "User session not found. Please log in again.",
    };
  }

  const res = await tryCatch(
    apiFetch<{ success: boolean; message: string; data?: unknown }>(
      ENDPOINTS.auth.changePassword,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
    "Failed to change password."
  );

  if (!res.ok) {
    console.error("Failed to change password:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to change password.",
    };
  }

  // On successful password change, clear auth cookies
  const cookieStore = await cookies();
  for (const name of ALL_AUTH_COOKIES) {
    cookieStore.delete(name);
  }

  return {
    success: true,
    message:
      res.data.message || "Password changed successfully. Please log in again.",
  };
}
