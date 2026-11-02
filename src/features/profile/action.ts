"use server";

import { cookies } from "next/headers";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { ALL_AUTH_COOKIES } from "@/lib/auth-cookies";

export type UserProfile = {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId?: string;
  mobileNumber?: string;
  profilePic?: string | null;
  status?: string;
  roles?: Array<{ id: number; code: string; name: string }>;
  [key: string]: unknown;
};

export type UpdateUserProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  profilePic: string | null;
  mobileNumber?: string;
};

export async function getCurrentUserProfile(): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "User session not found." };
  }

  try {
    const res = await apiFetch<{ success: boolean; data: UserProfile; message?: string }>(
      `/v1/users/${encodeURIComponent(user.id)}`
    );
    return {
      success: true,
      data: res.data,
    };
  } catch (error) {
    console.error("Failed to load user profile:", error);
    const message = error instanceof ApiError ? error.message : "Failed to load user profile.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateUserProfileAction(payload: UpdateUserProfilePayload): Promise<{
  success: boolean;
  data?: UserProfile;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "User session not found. Please log in again." };
  }

  try {
    const res = await apiFetch<{ success: boolean; data: UserProfile; message?: string }>(
      `/v1/users/${encodeURIComponent(user.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    return {
      success: true,
      data: res.data,
      message: res.message || "User updated successfully",
    };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    const message = error instanceof ApiError ? error.message : "Failed to update profile.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function changePasswordAction(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch<{ success: boolean; message: string; data?: unknown }>(
      "/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    // On successful password change, clear auth cookies
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }

    return {
      success: true,
      message: res.message || "Password changed successfully. Please log in again.",
    };
  } catch (error) {
    console.error("Failed to change password:", error);
    const message = error instanceof ApiError ? error.message : "Failed to change password.";
    return {
      success: false,
      error: message,
    };
  }
}

