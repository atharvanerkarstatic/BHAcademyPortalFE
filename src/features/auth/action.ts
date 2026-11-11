"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { config } from "@/config/env";
import {
  ALL_AUTH_COOKIES,
  AUTH_UPDATED_COOKIE,
  REFRESH_COOKIE,
  buildAuthCookies,
  userCookie,
  type TokenResponse,
} from "@/lib/auth-cookies";
import { refreshTokens } from "@/lib/auth-api";
import { extractAuthUser } from "@/lib/auth-jwt";

type LoginResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type ForgotPasswordOtpResult = {
  success: boolean;
  message: string;
  error?: string;
};

export type VerifyOtpResult = {
  success: boolean;
  message: string;
  resetToken?: string;
  maskedMobile?: string;
  expiresAt?: string;
  error?: string;
};

export type ResetPasswordResult = {
  success: boolean;
  message: string;
  error?: string;
};

function isTokenResponse(value: unknown): value is TokenResponse {
  if (typeof value !== "object" || value === null) return false;

  const tokens = value as Record<string, unknown>;
  return (
    typeof tokens.accessToken === "string" &&
    tokens.accessToken.length > 0 &&
    typeof tokens.refreshToken === "string" &&
    tokens.refreshToken.length > 0 &&
    typeof tokens.tokenType === "string" &&
    typeof tokens.expiresInSeconds === "number" &&
    Number.isFinite(tokens.expiresInSeconds) &&
    tokens.expiresInSeconds > 0 &&
    typeof tokens.issuedAt === "string"
  );
}

export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  const rawEmail = String(email ?? "").trim();
  const rawPassword = String(password ?? "").trim();

  if (!rawEmail || !rawPassword) {
    return { success: false, error: "Please enter your email ID and password." };
  }

  // Try standard normalized lowercase email first (e.g. test.admin@asianpaints.com)
  const candidateEmail = rawEmail.toLowerCase();

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: candidateEmail, password: rawPassword }),
      cache: "no-store",
    });

    // If 401 and the typed email had uppercase, retry with exact typed casing
    if (!response.ok && candidateEmail !== rawEmail) {
      const retryRes = await fetch(`${config.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
        body: JSON.stringify({ email: rawEmail, password: rawPassword }),
        cache: "no-store",
      });
      if (retryRes.ok) {
        response = retryRes;
      }
    }

    // If still 401 and password had leading/trailing spaces, retry with untrimmed password
    if (!response.ok && rawPassword !== password) {
      const retryRes = await fetch(`${config.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
        body: JSON.stringify({ email: candidateEmail, password }),
        cache: "no-store",
      });
      if (retryRes.ok) {
        response = retryRes;
      }
    }
  } catch (err) {
    console.error("Login fetch error:", err);
    return {
      success: false,
      error: "Unable to connect to the login service. Please check your network and try again.",
    };
  }

  let jsonResponse: unknown;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    console.error("Failed to parse JSON response:", err);
    jsonResponse = null;
  }

  if (!response.ok) {
    let backendMsg: string | undefined;
    if (jsonResponse && typeof jsonResponse === "object") {
      const obj = jsonResponse as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message.trim()) {
        backendMsg = obj.message.trim();
      } else if (typeof obj.error === "string" && obj.error.trim()) {
        backendMsg = obj.error.trim();
      } else if (typeof obj.details === "string" && obj.details.trim()) {
        backendMsg = obj.details.trim();
      }
    }

    // Clear any previous stale cookies on login failure
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }

    return {
      success: false,
      error:
        backendMsg ||
        (response.status === 401 || response.status === 403
          ? "Invalid email or password."
          : "Unable to sign in at the moment. Please try again."),
    };
  }

  if (!jsonResponse) {
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }
    return {
      success: false,
      error: "The login service returned an invalid response.",
    };
  }

  // Check if tokens are enclosed under `data` or returned directly at top level
  let tokens: unknown = jsonResponse;
  if (
    typeof jsonResponse === "object" &&
    jsonResponse !== null &&
    "data" in jsonResponse &&
    (jsonResponse as Record<string, unknown>).data
  ) {
    tokens = (jsonResponse as Record<string, unknown>).data;
  }

  if (!isTokenResponse(tokens)) {
    console.error("Login response failed isTokenResponse validation:", jsonResponse);
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }
    return {
      success: false,
      error: "The login service returned an invalid response.",
    };
  }

  // Validate the access token payload
  const authUser = extractAuthUser(tokens.accessToken);
  if (!authUser) {
    console.error("Failed to extract valid user from login accessToken");
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }
    return {
      success: false,
      error: "Authentication token is invalid or expired. Please contact administrator.",
    };
  }

  const cookieStore = await cookies();
  for (const cookie of buildAuthCookies(tokens)) {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
  }
  const emailCookie = userCookie(candidateEmail);
  cookieStore.set(emailCookie.name, emailCookie.value, emailCookie.options);

  redirect("/dashboard");
}

export async function requestPasswordResetOtpAction(email: string): Promise<ForgotPasswordOtpResult> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return {
      success: false,
      message: "Please enter your email ID.",
      error: "Please enter your email ID.",
    };
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/v1/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: normalizedEmail }),
      cache: "no-store",
    });

    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      (json && ((json.message as string) || (json.error as string) || (json.details as string))) ||
      (res.ok
        ? "An OTP has been sent to your registered email address."
        : "Failed to send OTP. Please check your email and try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    return {
      success: true,
      message: typeof json?.message === "string" ? json.message : apiMsg,
    };
  } catch (err) {
    console.error("requestPasswordResetOtpAction error:", err);
    return {
      success: false,
      message: "Unable to connect to the server. Please check your network and try again.",
      error: "Unable to connect to the server. Please check your network and try again.",
    };
  }
}

export async function verifyPasswordResetOtpAction(
  email: string,
  otp: string,
  salt: string = "test-123"
): Promise<VerifyOtpResult> {
  const normalizedEmail = email.trim();
  const normalizedOtp = otp.trim();

  if (!normalizedEmail || !normalizedOtp) {
    return {
      success: false,
      message: "Please enter the OTP verification code.",
      error: "Please enter the OTP verification code.",
    };
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/v1/forgot-password/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: normalizedOtp,
        salt: salt || "test-123",
      }),
      cache: "no-store",
    });

    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      (json && ((json.message as string) || (json.error as string) || (json.details as string))) ||
      (res.ok ? "OTP verified successfully. Use the reset token to set a new password." : "Invalid or expired OTP. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    const dataObj = (json?.data && typeof json.data === "object" ? json.data : {}) as Record<string, unknown>;
    const resetToken = (dataObj.resetToken as string) || (json?.resetToken as string);
    const maskedMobile = (dataObj.maskedMobile as string) || (json?.maskedMobile as string);
    const expiresAt = (dataObj.expiresAt as string) || (json?.expiresAt as string);

    return {
      success: true,
      message: typeof json?.message === "string" ? json.message : apiMsg,
      resetToken,
      maskedMobile,
      expiresAt,
    };
  } catch (err) {
    console.error("verifyPasswordResetOtpAction error:", err);
    return {
      success: false,
      message: "Failed to verify OTP. Please check your network and try again.",
      error: "Failed to verify OTP. Please check your network and try again.",
    };
  }
}

export async function resetPasswordWithTokenAction(payload: {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ResetPasswordResult> {
  const resetToken = payload.resetToken?.trim();
  const newPassword = payload.newPassword;
  const confirmPassword = payload.confirmPassword;

  if (!resetToken) {
    return {
      success: false,
      message: "Reset token is missing or expired. Please request a new OTP.",
      error: "Reset token is missing or expired. Please request a new OTP.",
    };
  }

  if (!newPassword || !confirmPassword) {
    return {
      success: false,
      message: "Please enter and confirm your new password.",
      error: "Please enter and confirm your new password.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "Passwords do not match.",
      error: "Passwords do not match.",
    };
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/v1/forgot-password/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({
        resetToken,
        newPassword,
        confirmPassword,
      }),
      cache: "no-store",
    });

    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      (json && ((json.message as string) || (json.error as string) || (json.details as string))) ||
      (res.ok ? "Password has been reset successfully. Please log in with your new password." : "Failed to reset password. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    return {
      success: true,
      message: typeof json?.message === "string" ? json.message : apiMsg,
    };
  } catch (err) {
    console.error("resetPasswordWithTokenAction error:", err);
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
      error: "Failed to reset password. Please try again.",
    };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  for (const name of ALL_AUTH_COOKIES) {
    cookieStore.delete(name);
  }
  redirect("/login");
}

export async function refreshUserSessionAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }
    return { success: false, error: "No refresh token available." };
  }

  try {
    const fresh = await refreshTokens(refreshToken);
    if (!fresh?.accessToken) {
      for (const name of ALL_AUTH_COOKIES) {
        cookieStore.delete(name);
      }
      return { success: false, error: "Session expired." };
    }

    const cookieList = buildAuthCookies(fresh);
    for (const c of cookieList) {
      cookieStore.set(c.name, c.value, c.options);
    }

    cookieStore.set(AUTH_UPDATED_COOKIE, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("refreshUserSessionAction error:", err);
    return { success: false, error: "Failed to refresh token." };
  }
}
