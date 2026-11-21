"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

import type {
  DashboardApiResponse,
  DashboardData,
  ModuleWiseSummaryItem,
  TrainerWiseSummaryItem,
  AssessmentSummaryData,
  ModuleWiseFilterPayload,
  TrainerWiseFilterPayload,
  AssessmentSummaryFilterPayload,
} from "./types";

function resolveFallbackErrorMessage(
  postError: { isApiError: boolean; message: string },
  getError: { isApiError: boolean; message: string },
  fallback: string
): string {
  if (postError.isApiError) {
    return postError.message;
  }
  if (getError.isApiError) {
    return getError.message;
  }
  return fallback;
}

export async function getDashboardDataAction(
  division?: string | null,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: DashboardData;
  error?: string;
}> {
  const auth = await requirePermission(
    "dashboard.read",
    "You do not have permission to view dashboard data."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: {},
    };
  }

  const query =
    division !== undefined && division !== null
      ? `?division=${encodeURIComponent(division.trim())}`
      : "?division=";

  const res = await tryCatch(
    apiFetch<DashboardApiResponse>(`${ENDPOINTS.dashboard.summary}${query}`, {
      signal: options?.signal,
    }),
    "Failed to load dashboard data. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to fetch dashboard data:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load dashboard data. Please try again.",
      data: {},
    };
  }

  return {
    success: true,
    data: res.data.data || {},
  };
}

export async function getDivisionsAction(
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: Array<string>;
  error?: string;
}> {
  const auth = await requirePermission(
    "dashboard.read",
    "You do not have permission to view division data."
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
      data: Array<string>;
    }>(ENDPOINTS.cities.divisions, { signal: options?.signal }),
    "Failed to load divisions."
  );

  if (!res.ok) {
    console.error("Failed to fetch divisions:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load divisions.",
      data: [],
    };
  }

  return {
    success: true,
    data: Array.isArray(res.data.data) ? res.data.data : [],
  };
}

export async function getModuleWiseDashboardAction(
  payload: ModuleWiseFilterPayload,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: Array<ModuleWiseSummaryItem>;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["dashboard.read", "audit.read", "system.all"],
    "You do not have permission to view module-wise summary."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [],
    };
  }

  const queryParams = new URLSearchParams();
  if (payload.division) {
    queryParams.set("division", payload.division);
  }
  if (payload.region) {
    queryParams.set("region", payload.region);
  }
  const trainerVal = payload.trainerId || payload.trainer;
  if (trainerVal) {
    queryParams.set("trainerId", String(trainerVal));
    queryParams.set("trainer", String(trainerVal));
  }
  if (payload.languageId) {
    queryParams.set("languageId", String(payload.languageId));
  }
  if (payload.startDate) {
    queryParams.set("startDate", payload.startDate);
  }
  if (payload.endDate) {
    queryParams.set("endDate", payload.endDate);
  }
  if (payload.modeOfTraining) {
    queryParams.set("modeOfTraining", payload.modeOfTraining);
  }
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : "";

  // Attempt 1: Try GET with query parameters (standard RESTful read)
  const getRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: Array<ModuleWiseSummaryItem>;
    }>(`${ENDPOINTS.dashboard.moduleWise}${queryString}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to load module-wise summary."
  );

  if (getRes.ok) {
    return {
      success: true,
      data: Array.isArray(getRes.data.data) ? getRes.data.data : [],
      message:
        getRes.data.message || "Module-wise summary fetched successfully",
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load module-wise summary.",
      data: [],
    };
  }

  const isMethodNotAllowed =
    (getRes.error.isApiError &&
      (getRes.error.status === 405 ||
        getRes.error.message.toLowerCase().includes("not supported"))) ||
    getRes.error.message.toLowerCase().includes("not supported");

  if (!isMethodNotAllowed) {
    console.warn(
      "GET /v1/dashboard/module-wise failed, attempting POST fallback:",
      getRes.error.cause
    );
  }

  // Attempt 2: Fallback to POST with body
  const body = {
    division: payload.division || null,
    region: payload.region || null,
    trainerId: trainerVal ? Number(trainerVal) || trainerVal : null,
    trainer: trainerVal || null,
    languageId: payload.languageId ? Number(payload.languageId) : null,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    modeOfTraining: payload.modeOfTraining || null,
  };

  const postRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: Array<ModuleWiseSummaryItem>;
    }>(ENDPOINTS.dashboard.moduleWise, {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
    "Failed to load module-wise summary."
  );

  if (!postRes.ok) {
    console.error(
      "Failed to fetch module-wise summary with both GET and POST:",
      postRes.error.cause
    );
    const message = resolveFallbackErrorMessage(
      postRes.error,
      getRes.error,
      "Failed to load module-wise summary."
    );
    return {
      success: false,
      error: message,
      data: [],
    };
  }

  return {
    success: true,
    data: Array.isArray(postRes.data.data) ? postRes.data.data : [],
    message: postRes.data.message || "Module-wise summary fetched successfully",
  };
}

export async function getTrainerWiseDashboardAction(
  payload: TrainerWiseFilterPayload,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: Array<TrainerWiseSummaryItem>;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["dashboard.read", "audit.read", "system.all"],
    "You do not have permission to view trainer-wise summary."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [],
    };
  }

  const courseIdValue = payload.courseId || payload.coursreId || null;
  const queryParams = new URLSearchParams();
  if (payload.division) {
    queryParams.set("division", payload.division);
  }
  if (payload.region) {
    queryParams.set("region", payload.region);
  }
  if (payload.languageId) {
    queryParams.set("languageId", String(payload.languageId));
  }
  if (courseIdValue) {
    queryParams.set("courseId", String(courseIdValue));
    queryParams.set("coursreId", String(courseIdValue));
  }
  if (payload.startDate) {
    queryParams.set("startDate", payload.startDate);
  }
  if (payload.endDate) {
    queryParams.set("endDate", payload.endDate);
  }
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : "";

  // Attempt 1: Try GET with query parameters
  const getRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: TrainerWiseSummaryItem | Array<TrainerWiseSummaryItem>;
    }>(`${ENDPOINTS.dashboard.trainerWise}${queryString}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to load trainer-wise summary."
  );

  if (getRes.ok) {
    let items: Array<TrainerWiseSummaryItem> = [];
    if (Array.isArray(getRes.data.data)) {
      items = getRes.data.data;
    } else if (getRes.data.data && typeof getRes.data.data === "object") {
      items = [getRes.data.data];
    }

    return {
      success: true,
      data: items,
      message:
        getRes.data.message || "Trainer-wise summary fetched successfully",
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load trainer-wise summary.",
      data: [],
    };
  }

  // Attempt 2: Fallback to POST
  const body = {
    division: payload.division || null,
    region: payload.region || null,
    languageId: payload.languageId ? Number(payload.languageId) : null,
    coursreId: courseIdValue ? Number(courseIdValue) : null,
    courseId: courseIdValue ? Number(courseIdValue) : null,
    startDate: payload.startDate || "",
    endDate: payload.endDate || "",
  };

  const postRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: TrainerWiseSummaryItem | Array<TrainerWiseSummaryItem>;
    }>(ENDPOINTS.dashboard.trainerWise, {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
    "Failed to load trainer-wise summary."
  );

  if (!postRes.ok) {
    console.error(
      "Failed to fetch trainer-wise summary with both GET and POST:",
      postRes.error.cause
    );
    const message = resolveFallbackErrorMessage(
      postRes.error,
      getRes.error,
      "Failed to load trainer-wise summary."
    );
    return {
      success: false,
      error: message,
      data: [],
    };
  }

  let items: Array<TrainerWiseSummaryItem> = [];
  if (Array.isArray(postRes.data.data)) {
    items = postRes.data.data;
  } else if (postRes.data.data && typeof postRes.data.data === "object") {
    items = [postRes.data.data];
  }

  return {
    success: true,
    data: items,
    message:
      postRes.data.message || "Trainer-wise summary fetched successfully",
  };
}

export async function getAssessmentSummaryDashboardAction(
  payload: AssessmentSummaryFilterPayload,
  options?: ActionRequestOptions
): Promise<{
  success: boolean;
  data: AssessmentSummaryData;
  message?: string;
  error?: string;
}> {
  const auth = await requirePermission(
    ["dashboard.read", "audit.read", "system.all"],
    "You do not have permission to view assessment summary."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: { passed: 0, failed: 0, total: 0 },
    };
  }

  const courseIdValue = payload.courseId || payload.coursreId || null;
  const queryParams = new URLSearchParams();
  if (payload.trainingMode) {
    queryParams.set("trainingMode", payload.trainingMode);
  }
  if (payload.trainerId) {
    queryParams.set("trainerId", String(payload.trainerId));
  }
  if (payload.languageId) {
    queryParams.set("languageId", String(payload.languageId));
  }
  if (courseIdValue) {
    queryParams.set("courseId", String(courseIdValue));
    queryParams.set("coursreId", String(courseIdValue));
  }
  if (payload.startDate) {
    queryParams.set("startDate", payload.startDate);
  }
  if (payload.endDate) {
    queryParams.set("endDate", payload.endDate);
  }
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : "";

  // Attempt 1: Try GET with query parameters
  const getRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: { passed: number; failed: number };
    }>(`${ENDPOINTS.dashboard.assessmentSummary}${queryString}`, {
      method: "GET",
      signal: options?.signal,
    }),
    "Failed to load assessment summary."
  );

  if (getRes.ok) {
    const passed = Number(getRes.data?.data?.passed) || 0;
    const failed = Number(getRes.data?.data?.failed) || 0;

    return {
      success: true,
      data: {
        passed,
        failed,
        total: passed + failed,
      },
      message:
        getRes.data?.message || "Assessment summary fetched successfully",
    };
  }

  if (options?.signal?.aborted) {
    return {
      success: false,
      error: "Failed to load assessment summary.",
      data: { passed: 0, failed: 0, total: 0 },
    };
  }

  // Attempt 2: Fallback to POST
  const body = {
    trainingMode: payload.trainingMode || "PHYSICAL",
    trainerId: payload.trainerId ? Number(payload.trainerId) : null,
    languageId: payload.languageId ? Number(payload.languageId) : null,
    coursreId: courseIdValue ? Number(courseIdValue) : null,
    courseId: courseIdValue ? Number(courseIdValue) : null,
    startDate: payload.startDate || "",
    endDate: payload.endDate || "",
  };

  const postRes = await tryCatch(
    apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: { passed: number; failed: number };
    }>(ENDPOINTS.dashboard.assessmentSummary, {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
    "Failed to load assessment summary."
  );

  if (!postRes.ok) {
    console.error(
      "Failed to fetch assessment summary with both GET and POST:",
      postRes.error.cause
    );
    const message = resolveFallbackErrorMessage(
      postRes.error,
      getRes.error,
      "Failed to load assessment summary."
    );
    return {
      success: false,
      error: message,
      data: { passed: 0, failed: 0, total: 0 },
    };
  }

  const passed = Number(postRes.data?.data?.passed) || 0;
  const failed = Number(postRes.data?.data?.failed) || 0;

  return {
    success: true,
    data: {
      passed,
      failed,
      total: passed + failed,
    },
    message: postRes.data?.message || "Assessment summary fetched successfully",
  };
}
