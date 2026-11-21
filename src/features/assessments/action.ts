"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  SendAssessmentLinkPayload,
  SendAssessmentLinkResponse,
  AssessmentLinkPageResponse,
  AssessmentResultPageResponse,
} from "./types";

export async function sendAssessmentLinkAction(
  payload: SendAssessmentLinkPayload
): Promise<SendAssessmentLinkResponse> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "courses.read") &&
    !hasPermission(userPerms, "courses.create") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      message: "You do not have permission to send assessment links.",
      data: [],
      error: "Permission denied",
    };
  }

  try {
    const formattedPayload = {
      trainerId: Number(payload.trainerId),
      languageId: Number(payload.languageId),
      courseId: Number(payload.courseId),
      trainingDate: payload.trainingDate,
      mobileNumbers: payload.mobileNumbers,
    };

    const res = await apiFetch<SendAssessmentLinkResponse>(
      ENDPOINTS.assessments.sendLink,
      {
        method: "POST",
        body: JSON.stringify(formattedPayload),
      }
    );

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message || "Assessment records created successfully",
      data: res.data || [],
    };
  } catch (error: unknown) {
    console.error("sendAssessmentLinkAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        message: error.message,
        data: [],
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      message: error instanceof Error ? error.message : "Failed to send assessment links",
      data: [],
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getAssessmentLinksAction(params: {
  page?: number;
  size?: number;
  search?: string;
}): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: AssessmentLinkPageResponse;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "courses.read") &&
    !hasPermission(userPerms, "system.all")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to view assessment links.",
    };
  }

  try {
    const page = params.page ? Math.max(0, params.page - 1) : 0;
    const size = params.size || 10;
    const search = params.search ? encodeURIComponent(params.search.trim()) : "";

    const query = `?search=${search}&page=${page}&size=${size}`;
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AssessmentLinkPageResponse;
    }>(`${ENDPOINTS.assessments.links}${query}`, {
      method: "GET",
    });

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("getAssessmentLinksAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch assessment links",
    };
  }
}

export async function getAssessmentResultsAction(params: {
  page?: number;
  size?: number;
  search?: string;
}): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: AssessmentResultPageResponse;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "audit.read") &&
    !hasPermission(userPerms, "system.all") &&
    !hasPermission(userPerms, "courses.read")
  ) {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to view assessment results.",
    };
  }

  try {
    const page = params.page ? Math.max(0, params.page - 1) : 0;
    const size = params.size || 10;
    const search = params.search ? encodeURIComponent(params.search.trim()) : "";

    const query = `?page=${page}&size=${size}&search=${search}`;
    const res = await apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AssessmentResultPageResponse;
    }>(`${ENDPOINTS.assessments.results}${query}`, {
      method: "GET",
    });

    return {
      success: res.success ?? true,
      status: res.status ?? 200,
      message: res.message,
      data: res.data,
    };
  } catch (error: unknown) {
    console.error("getAssessmentResultsAction error:", error);
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        error: error.message,
      };
    }
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch assessment results",
    };
  }
}

