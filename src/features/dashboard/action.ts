"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
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

export async function getDashboardDataAction(): Promise<{
  success: boolean;
  data: DashboardData;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "dashboard.read")) {
    return {
      success: false,
      error: "You do not have permission to view dashboard data.",
      data: {},
    };
  }

  try {
    const res = await apiFetch<DashboardApiResponse>("/v1/dashboard");
    return {
      success: true,
      data: res.data || {},
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load dashboard data. Please try again.";
    return {
      success: false,
      error: message,
      data: {},
    };
  }
}

export async function getModuleWiseDashboardAction(payload: ModuleWiseFilterPayload): Promise<{
  success: boolean;
  data: ModuleWiseSummaryItem[];
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "dashboard.read") && !hasPermission(userPerms, "audit.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view module-wise summary.",
      data: [],
    };
  }

  const queryParams = new URLSearchParams();
  if (payload.division) queryParams.set("division", payload.division);
  if (payload.region) queryParams.set("region", payload.region);
  if (payload.languageId) queryParams.set("languageId", String(payload.languageId));
  if (payload.startDate) queryParams.set("startDate", payload.startDate);
  if (payload.endDate) queryParams.set("endDate", payload.endDate);
  if (payload.modeOfTraining) queryParams.set("modeOfTraining", payload.modeOfTraining);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // Attempt 1: Try GET with query parameters (standard RESTful read)
  try {
    const res = await apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: ModuleWiseSummaryItem[];
    }>(`/v1/dashboard/module-wise${queryString}`, {
      method: "GET",
    });

    return {
      success: true,
      data: Array.isArray(res.data) ? res.data : [],
      message: res.message || "Module-wise summary fetched successfully",
    };
  } catch (getErr) {
    const isMethodNotAllowed =
      (getErr instanceof ApiError && (getErr.status === 405 || getErr.message?.toLowerCase().includes("not supported"))) ||
      (getErr instanceof Error && getErr.message?.toLowerCase().includes("not supported"));

    if (!isMethodNotAllowed) {
      console.warn("GET /v1/dashboard/module-wise failed, attempting POST fallback:", getErr);
    }

    // Attempt 2: Fallback to POST with body
    try {
      const body = {
        division: payload.division || null,
        region: payload.region || null,
        languageId: payload.languageId ? Number(payload.languageId) : null,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        modeOfTraining: payload.modeOfTraining || null,
      };

      const res = await apiFetch<{
        success?: boolean;
        status?: number;
        message?: string;
        data?: ModuleWiseSummaryItem[];
      }>("/v1/dashboard/module-wise", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: true,
        data: Array.isArray(res.data) ? res.data : [],
        message: res.message || "Module-wise summary fetched successfully",
      };
    } catch (postErr) {
      console.error("Failed to fetch module-wise summary with both GET and POST:", postErr);
      const message =
        postErr instanceof ApiError
          ? postErr.message
          : getErr instanceof ApiError
          ? getErr.message
          : "Failed to load module-wise summary.";
      return {
        success: false,
        error: message,
        data: [],
      };
    }
  }
}

export async function getTrainerWiseDashboardAction(payload: TrainerWiseFilterPayload): Promise<{
  success: boolean;
  data: TrainerWiseSummaryItem[];
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "dashboard.read") && !hasPermission(userPerms, "audit.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view trainer-wise summary.",
      data: [],
    };
  }

  const courseIdValue = payload.courseId || payload.coursreId || null;
  const queryParams = new URLSearchParams();
  if (payload.division) queryParams.set("division", payload.division);
  if (payload.region) queryParams.set("region", payload.region);
  if (payload.languageId) queryParams.set("languageId", String(payload.languageId));
  if (courseIdValue) {
    queryParams.set("courseId", String(courseIdValue));
    queryParams.set("coursreId", String(courseIdValue));
  }
  if (payload.startDate) queryParams.set("startDate", payload.startDate);
  if (payload.endDate) queryParams.set("endDate", payload.endDate);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // Attempt 1: Try GET with query parameters
  try {
    const res = await apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: TrainerWiseSummaryItem | TrainerWiseSummaryItem[];
    }>(`/v1/dashboard/trainer-wise${queryString}`, {
      method: "GET",
    });

    let items: TrainerWiseSummaryItem[] = [];
    if (Array.isArray(res.data)) {
      items = res.data;
    } else if (res.data && typeof res.data === "object") {
      items = [res.data];
    }

    return {
      success: true,
      data: items,
      message: res.message || "Trainer-wise summary fetched successfully",
    };
  } catch (getErr) {
    // Attempt 2: Fallback to POST
    try {
      const body = {
        division: payload.division || null,
        region: payload.region || null,
        languageId: payload.languageId ? Number(payload.languageId) : null,
        coursreId: courseIdValue ? Number(courseIdValue) : null,
        courseId: courseIdValue ? Number(courseIdValue) : null,
        startDate: payload.startDate || "",
        endDate: payload.endDate || "",
      };

      const res = await apiFetch<{
        success?: boolean;
        status?: number;
        message?: string;
        data?: TrainerWiseSummaryItem | TrainerWiseSummaryItem[];
      }>("/v1/dashboard/trainer-wise", {
        method: "POST",
        body: JSON.stringify(body),
      });

      let items: TrainerWiseSummaryItem[] = [];
      if (Array.isArray(res.data)) {
        items = res.data;
      } else if (res.data && typeof res.data === "object") {
        items = [res.data];
      }

      return {
        success: true,
        data: items,
        message: res.message || "Trainer-wise summary fetched successfully",
      };
    } catch (postErr) {
      console.error("Failed to fetch trainer-wise summary with both GET and POST:", postErr);
      const message =
        postErr instanceof ApiError
          ? postErr.message
          : getErr instanceof ApiError
          ? getErr.message
          : "Failed to load trainer-wise summary.";
      return {
        success: false,
        error: message,
        data: [],
      };
    }
  }
}

export async function getAssessmentSummaryDashboardAction(payload: AssessmentSummaryFilterPayload): Promise<{
  success: boolean;
  data: AssessmentSummaryData;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "dashboard.read") && !hasPermission(userPerms, "audit.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to view assessment summary.",
      data: { passed: 0, failed: 0, total: 0 },
    };
  }

  const courseIdValue = payload.courseId || payload.coursreId || null;
  const queryParams = new URLSearchParams();
  if (payload.trainingMode) queryParams.set("trainingMode", payload.trainingMode);
  if (payload.trainerId) queryParams.set("trainerId", String(payload.trainerId));
  if (payload.languageId) queryParams.set("languageId", String(payload.languageId));
  if (courseIdValue) {
    queryParams.set("courseId", String(courseIdValue));
    queryParams.set("coursreId", String(courseIdValue));
  }
  if (payload.startDate) queryParams.set("startDate", payload.startDate);
  if (payload.endDate) queryParams.set("endDate", payload.endDate);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // Attempt 1: Try GET with query parameters
  try {
    const res = await apiFetch<{
      success?: boolean;
      status?: number;
      message?: string;
      data?: { passed: number; failed: number };
    }>(`/v1/dashboard/assessment-summary${queryString}`, {
      method: "GET",
    });

    const passed = Number(res?.data?.passed) || 0;
    const failed = Number(res?.data?.failed) || 0;

    return {
      success: true,
      data: {
        passed,
        failed,
        total: passed + failed,
      },
      message: res?.message || "Assessment summary fetched successfully",
    };
  } catch (getErr) {
    // Attempt 2: Fallback to POST
    try {
      const body = {
        trainingMode: payload.trainingMode || "PHYSICAL",
        trainerId: payload.trainerId ? Number(payload.trainerId) : null,
        languageId: payload.languageId ? Number(payload.languageId) : null,
        coursreId: courseIdValue ? Number(courseIdValue) : null,
        courseId: courseIdValue ? Number(courseIdValue) : null,
        startDate: payload.startDate || "",
        endDate: payload.endDate || "",
      };

      const res = await apiFetch<{
        success?: boolean;
        status?: number;
        message?: string;
        data?: { passed: number; failed: number };
      }>("/v1/dashboard/assessment-summary", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const passed = Number(res?.data?.passed) || 0;
      const failed = Number(res?.data?.failed) || 0;

      return {
        success: true,
        data: {
          passed,
          failed,
          total: passed + failed,
        },
        message: res?.message || "Assessment summary fetched successfully",
      };
    } catch (postErr) {
      console.error("Failed to fetch assessment summary with both GET and POST:", postErr);
      const message =
        postErr instanceof ApiError
          ? postErr.message
          : getErr instanceof ApiError
          ? getErr.message
          : "Failed to load assessment summary.";
      return {
        success: false,
        error: message,
        data: { passed: 0, failed: 0, total: 0 },
      };
    }
  }
}
