"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ENDPOINTS } from "@/config/endpoints";
import { config } from "@/config/env";
import { ALL_AUTH_COOKIES, AUTH_UPDATED_COOKIE, REFRESH_COOKIE, buildAuthCookies, userCookie } from '@/lib/auth-cookies';
import type { TokenResponse } from '@/lib/auth-cookies';
import { refreshTokens } from "@/lib/auth-api";
import { extractAuthUser } from "@/lib/auth-jwt";
import { extractErrorMessage, getStringProp, isRecord } from "@/lib/type-guards";

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
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    typeof value.tokenType === "string" &&
    typeof value.expiresInSeconds === "number" &&
    Number.isFinite(value.expiresInSeconds) &&
    value.expiresInSeconds > 0 &&
    typeof value.issuedAt === "string"
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

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.login}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: rawEmail, password: rawPassword }),
      cache: "no-store",
    });
  } catch {
    return {
      success: false,
      error: "Unable to connect to the login service. Please check your network and try again.",
    };
  }

  let jsonResponse: unknown;
  try {
    jsonResponse = await response.json();
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const backendMsg = extractErrorMessage(jsonResponse);

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
  const tokens: unknown =
    isRecord(jsonResponse) && "data" in jsonResponse && jsonResponse.data
      ? jsonResponse.data
      : jsonResponse;

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

  // Strict case-sensitive check between entered email and token subject email
  if (authUser.email && authUser.email !== rawEmail) {
    console.warn(`Email casing mismatch: entered '${rawEmail}', token has '${authUser.email}'`);
    const cookieStore = await cookies();
    for (const name of ALL_AUTH_COOKIES) {
      cookieStore.delete(name);
    }
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  const cookieStore = await cookies();
  for (const cookie of buildAuthCookies(tokens)) {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
  }
  const emailCookie = userCookie(rawEmail);
  cookieStore.set(emailCookie.name, emailCookie.value, emailCookie.options);

  // Check user permissions and redirect to Dashboard or first accessible route
  const { getFirstAccessibleRoute } = await import("@/lib/route-permissions");
  const userPerms = [...authUser.roles, ...authUser.permissions];
  const targetRoute = getFirstAccessibleRoute(userPerms);

  if (!targetRoute) {
    redirect("/access-denied");
  }

  redirect(targetRoute);
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
    const res = await fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.forgotPassword}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: normalizedEmail }),
      cache: "no-store",
    });

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      extractErrorMessage(json) ||
      (res.ok
        ? "An OTP has been sent to your registered email address."
        : "Failed to send OTP. Please check your email and try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    return {
      success: true,
      message: (isRecord(json) ? getStringProp(json, "message") : undefined) ?? apiMsg,
    };
  } catch {
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
  salt = "test-123"
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
    const res = await fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.verifyOtp}`, {
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

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      extractErrorMessage(json) ||
      (res.ok
        ? "OTP verified successfully. Use the reset token to set a new password."
        : "Invalid or expired OTP. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    const rootObj = isRecord(json) ? json : {};
    const dataObj = isRecord(rootObj.data) ? rootObj.data : {};
    const resetToken = getStringProp(dataObj, "resetToken") ?? getStringProp(rootObj, "resetToken");
    const maskedMobile =
      getStringProp(dataObj, "maskedMobile") ?? getStringProp(rootObj, "maskedMobile");
    const expiresAt = getStringProp(dataObj, "expiresAt") ?? getStringProp(rootObj, "expiresAt");

    return {
      success: true,
      message: getStringProp(rootObj, "message") ?? apiMsg,
      resetToken,
      maskedMobile,
      expiresAt,
    };
  } catch {
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
    const res = await fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.resetPassword}`, {
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

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiMsg =
      extractErrorMessage(json) ||
      (res.ok
        ? "Password has been reset successfully. Please log in with your new password."
        : "Failed to reset password. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    return {
      success: true,
      message: (isRecord(json) ? getStringProp(json, "message") : undefined) ?? apiMsg,
    };
  } catch {
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
  } catch (error: unknown) {
    console.error("refreshUserSessionAction error:", error);
    return { success: false, error: "Failed to refresh token." };
  }
}
