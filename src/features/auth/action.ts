"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ENDPOINTS } from "@/config/endpoints";
import { config } from "@/config/env";
import { refreshTokens } from "@/lib/auth-api";
import {
  ALL_AUTH_COOKIES,
  AUTH_UPDATED_COOKIE,
  REFRESH_COOKIE,
  buildAuthCookies,
  userCookie,
} from "@/lib/auth-cookies";
import type { TokenResponse } from "@/lib/auth-cookies";
import { extractAuthUser } from "@/lib/auth-jwt";
import { tryCatch } from "@/lib/try-catch";
import { asString, extractErrorMessage, isRecord } from "@/lib/type-guards";

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

interface LoginResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ForgotPasswordOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  resetToken?: string;
  maskedMobile?: string;
  expiresAt?: string;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    "refreshToken" in value &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    "tokenType" in value &&
    typeof value.tokenType === "string" &&
    "expiresInSeconds" in value &&
    typeof value.expiresInSeconds === "number" &&
    Number.isFinite(value.expiresInSeconds) &&
    value.expiresInSeconds > 0 &&
    "issuedAt" in value &&
    typeof value.issuedAt === "string"
  );
}

export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  const rawEmail = (email ?? "").trim();
  const rawPassword = (password ?? "").trim();

  if (!rawEmail || !rawPassword) {
    return {
      success: false,
      error: "Please enter your email ID and password.",
    };
  }

  const fetchResult = await tryCatch(
    fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.login}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: rawEmail, password: rawPassword }),
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    }),
    "Unable to connect to the login service. Please check your network and try again."
  );

  if (!fetchResult.ok) {
    return {
      success: false,
      error:
        "Unable to connect to the login service. Please check your network and try again.",
    };
  }

  const response = fetchResult.data;
  const parsedJson = await tryCatch<unknown>(response.json());
  const jsonResponse = parsedJson.ok ? parsedJson.data : null;

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
    console.error(
      "Login response failed isTokenResponse validation:",
      jsonResponse
    );
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
      error:
        "Authentication token is invalid or expired. Please contact administrator.",
    };
  }

  // Strict case-sensitive check between entered email and token subject email
  if (authUser.email && authUser.email !== rawEmail) {
    console.warn(
      `Email casing mismatch: entered '${rawEmail}', token has '${authUser.email}'`
    );
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
    return redirect("/access-denied");
  }

  return redirect(targetRoute);
}

export async function requestPasswordResetOtpAction(
  email: string
): Promise<ForgotPasswordOtpResult> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return {
      success: false,
      message: "Please enter your email ID.",
      error: "Please enter your email ID.",
    };
  }

  const fetchResult = await tryCatch(
    fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.forgotPassword}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    }),
    "Unable to connect to the server. Please check your network and try again."
  );

  if (!fetchResult.ok) {
    return {
      success: false,
      message:
        "Unable to connect to the server. Please check your network and try again.",
      error:
        "Unable to connect to the server. Please check your network and try again.",
    };
  }

  const res = fetchResult.data;
  const parsedJson = await tryCatch<unknown>(res.json());
  const json = parsedJson.ok ? parsedJson.data : null;

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
    message:
      (isRecord(json) && "message" in json
        ? asString(json.message)
        : undefined) ?? apiMsg,
  };
}

export async function verifyPasswordResetOtpAction(
  email: string,
  otp: string,
  salt?: string
): Promise<VerifyOtpResult> {
  const normalizedEmail = email.trim();
  const normalizedOtp = otp.trim();
  const effectiveSalt =
    salt || (process.env.FORGOT_PASSWORD_OTP_SALT ?? "test-123");

  if (!normalizedEmail || !normalizedOtp) {
    return {
      success: false,
      message: "Please enter the OTP verification code.",
      error: "Please enter the OTP verification code.",
    };
  }

  const fetchResult = await tryCatch(
    fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.verifyOtp}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: normalizedOtp,
        salt: effectiveSalt,
      }),
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    }),
    "Failed to verify OTP. Please check your network and try again."
  );

  if (!fetchResult.ok) {
    return {
      success: false,
      message: "Failed to verify OTP. Please check your network and try again.",
      error: "Failed to verify OTP. Please check your network and try again.",
    };
  }

  const res = fetchResult.data;
  const parsedJson = await tryCatch<unknown>(res.json());
  const json = parsedJson.ok ? parsedJson.data : null;

  const apiMsg =
    extractErrorMessage(json) ||
    (res.ok
      ? "OTP verified successfully. Use the reset token to set a new password."
      : "Invalid or expired OTP. Please try again.");

  if (!res.ok) {
    return { success: false, message: apiMsg, error: apiMsg };
  }

  const rootObj = isRecord(json) ? json : null;
  const dataObj =
    rootObj && "data" in rootObj && isRecord(rootObj.data)
      ? rootObj.data
      : null;
  const resetToken =
    (dataObj && "resetToken" in dataObj
      ? asString(dataObj.resetToken)
      : undefined) ??
    (rootObj && "resetToken" in rootObj
      ? asString(rootObj.resetToken)
      : undefined);
  const maskedMobile =
    (dataObj && "maskedMobile" in dataObj
      ? asString(dataObj.maskedMobile)
      : undefined) ??
    (rootObj && "maskedMobile" in rootObj
      ? asString(rootObj.maskedMobile)
      : undefined);
  const expiresAt =
    (dataObj && "expiresAt" in dataObj
      ? asString(dataObj.expiresAt)
      : undefined) ??
    (rootObj && "expiresAt" in rootObj
      ? asString(rootObj.expiresAt)
      : undefined);

  return {
    success: true,
    message:
      (rootObj && "message" in rootObj
        ? asString(rootObj.message)
        : undefined) ?? apiMsg,
    resetToken,
    maskedMobile,
    expiresAt,
  };
}

export async function resetPasswordWithTokenAction(payload: {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ResetPasswordResult> {
  const resetToken = payload.resetToken?.trim();
  const { newPassword } = payload;
  const { confirmPassword } = payload;

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

  const fetchResult = await tryCatch(
    fetch(`${config.apiBaseUrl}${ENDPOINTS.auth.resetPassword}`, {
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
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    }),
    "Failed to reset password. Please try again."
  );

  if (!fetchResult.ok) {
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
      error: "Failed to reset password. Please try again.",
    };
  }

  const res = fetchResult.data;
  const parsedJson = await tryCatch<unknown>(res.json());
  const json = parsedJson.ok ? parsedJson.data : null;

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
    message:
      (isRecord(json) && "message" in json
        ? asString(json.message)
        : undefined) ?? apiMsg,
  };
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

  const refreshResult = await tryCatch(
    refreshTokens(refreshToken),
    "Failed to refresh token."
  );
  if (!refreshResult.ok) {
    console.error("refreshUserSessionAction error:", refreshResult.error.cause);
    return { success: false, error: "Failed to refresh token." };
  }

  const fresh = refreshResult.data;
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
}
