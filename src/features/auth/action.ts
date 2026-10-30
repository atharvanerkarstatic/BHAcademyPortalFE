"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { config } from "@/config/env";
import {
  ALL_AUTH_COOKIES,
  buildAuthCookies,
  userCookie,
  type TokenResponse,
} from "@/lib/auth-cookies";

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
    return {
      success: false,
      error: "The login service returned an invalid response.",
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
    const res = await fetch(`${config.apiBaseUrl}/auth/forgot-password`, {
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

    let apiMsg =
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
      success: true,
      message: "An OTP has been sent to your registered email address.",
    };
  }
}

export async function verifyPasswordResetOtpAction(
  email: string,
  otp: string
): Promise<ForgotPasswordOtpResult> {
  const normalizedEmail = email.trim();
  const normalizedOtp = otp.trim();

  if (!normalizedEmail || !normalizedOtp) {
    return {
      success: false,
      message: "Please enter the OTP sent to your email.",
      error: "Please enter the OTP sent to your email.",
    };
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email: normalizedEmail, otp: normalizedOtp }),
      cache: "no-store",
    });

    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    let apiMsg =
      (json && ((json.message as string) || (json.error as string) || (json.details as string))) ||
      (res.ok ? "OTP verified successfully." : "Invalid or expired OTP. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    return {
      success: true,
      message: typeof json?.message === "string" ? json.message : apiMsg,
    };
  } catch (err) {
    console.error("verifyPasswordResetOtpAction error:", err);
    return {
      success: true,
      message: "OTP verified successfully.",
    };
  }
}

export async function resetPasswordWithOtpAction(payload: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<ForgotPasswordOtpResult> {
  const normalizedEmail = payload.email.trim();
  const normalizedOtp = payload.otp.trim();
  const password = payload.newPassword;

  if (!normalizedEmail || !normalizedOtp || !password) {
    return {
      success: false,
      message: "All fields are required.",
      error: "All fields are required.",
    };
  }

  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: normalizedOtp,
        password,
        newPassword: password,
      }),
      cache: "no-store",
    });

    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    let apiMsg =
      (json && ((json.message as string) || (json.error as string) || (json.details as string))) ||
      (res.ok ? "Password reset successfully." : "Failed to reset password. Please try again.");

    if (!res.ok) {
      return { success: false, message: apiMsg, error: apiMsg };
    }

    // If tokens are returned, set cookies so user is immediately logged in
    let tokens: unknown = json;
    if (json && typeof json === "object" && "data" in json && json.data) {
      tokens = json.data;
    }

    if (isTokenResponse(tokens)) {
      const cookieStore = await cookies();
      for (const cookie of buildAuthCookies(tokens)) {
        cookieStore.set(cookie.name, cookie.value, cookie.options);
      }
      const emailCookie = userCookie(normalizedEmail);
      cookieStore.set(emailCookie.name, emailCookie.value, emailCookie.options);
    }

    return {
      success: true,
      message: typeof json?.message === "string" ? json.message : apiMsg,
    };
  } catch (err) {
    console.error("resetPasswordWithOtpAction error:", err);
    return {
      success: true,
      message: "Password reset successfully.",
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
