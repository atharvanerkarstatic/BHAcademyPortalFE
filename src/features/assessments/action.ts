"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

import type {
  SendAssessmentLinkPayload,
  SendAssessmentLinkResponse,
  AssessmentLinkPageResponse,
  AssessmentResultPageResponse,
} from "./types";

export async function sendAssessmentLinkAction(
  payload: SendAssessmentLinkPayload
): Promise<SendAssessmentLinkResponse> {
  const auth = await requirePermission(
    ["courses.read", "courses.create", "system.all"],
    "You do not have permission to send assessment links."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      message: auth.error,
      data: [],
      error: "Permission denied",
    };
  }

  const formattedPayload = {
    trainerId: Number(payload.trainerId),
    languageId: Number(payload.languageId),
    courseId: Number(payload.courseId),
    trainingDate: payload.trainingDate,
    mobileNumbers: payload.mobileNumbers,
  };

  const res = await tryCatch(
    apiFetch<SendAssessmentLinkResponse>(ENDPOINTS.assessments.sendLink, {
      method: "POST",
      body: JSON.stringify(formattedPayload),
    }),
    "Failed to send assessment links"
  );

  if (!res.ok) {
    console.error("sendAssessmentLinkAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      message: res.error.message,
      data: [],
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message || "Assessment records created successfully",
    data: res.data.data || [],
  };
}

export async function getAssessmentLinksAction(
  params: {
    page?: number;
    size?: number;
    search?: string;
  },
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: AssessmentLinkPageResponse;
  error?: string;
}> {
  const auth = await requirePermission(
    ["courses.read", "system.all"],
    "You do not have permission to view assessment links."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const page = params.page ? Math.max(0, params.page - 1) : 0;
  const size = params.size || 10;
  const search = params.search ? encodeURIComponent(params.search.trim()) : "";

  const query = `?search=${search}&page=${page}&size=${size}`;
  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AssessmentLinkPageResponse;
    }>(`${ENDPOINTS.assessments.links}${query}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch assessment links"
  );

  if (!res.ok) {
    console.error("getAssessmentLinksAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message,
    data: res.data.data,
  };
}

export async function getAssessmentResultsAction(
  params: {
    page?: number;
    size?: number;
    search?: string;
  },
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  status: number;
  message?: string;
  data?: AssessmentResultPageResponse;
  error?: string;
}> {
  const auth = await requirePermission(
    ["audit.read", "system.all", "courses.read"],
    "You do not have permission to view assessment results."
  );
  if (!auth.ok) {
    return {
      success: false,
      status: auth.status,
      error: auth.error,
    };
  }

  const page = params.page ? Math.max(0, params.page - 1) : 0;
  const size = params.size || 10;
  const search = params.search ? encodeURIComponent(params.search.trim()) : "";

  const query = `?page=${page}&size=${size}&search=${search}`;
  const res = await tryCatch(
    apiFetch<{
      success: boolean;
      status: number;
      message: string;
      data: AssessmentResultPageResponse;
    }>(`${ENDPOINTS.assessments.results}${query}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to fetch assessment results"
  );

  if (!res.ok) {
    console.error("getAssessmentResultsAction error:", res.error.cause);
    return {
      success: false,
      status: res.error.status,
      error: res.error.message,
    };
  }

  return {
    success: res.data.success ?? true,
    status: res.data.status ?? 200,
    message: res.data.message,
    data: res.data.data,
  };
}
