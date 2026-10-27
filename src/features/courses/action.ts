"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";

import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import type {
  ApiResponse,
  CoursePageResponse,
  CourseItem,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "./types";


export type GetCoursesParams = {
  search?: string;
  page?: number;
  size?: number;
  sort?: "ASC" | "DESC" | string;
};

export async function getCoursesAction(params: GetCoursesParams = {}) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.read")) {
    return {
      success: false,
      error: "You do not have permission to view courses.",
      data: {
        content: [],
        page: 1,
        size: params.size ?? 10,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      } as CoursePageResponse,
    };
  }

  const page = params.page ?? 1;
  const size = params.size ?? 10;
  const sort = params.sort ?? "ASC";

  // Spring Pageable is 0-indexed on the backend
  const apiPage = Math.max(page - 1, 0);

  const searchParams = new URLSearchParams({
    page: String(apiPage),
    size: String(size),
    sort,
  });

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  try {
    const res = await apiFetch<ApiResponse<CoursePageResponse>>(
      `/v1/courses?${searchParams.toString()}`
    );

    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load courses. Please try again.";
    return {
      success: false,
      error: message,
      data: {
        content: [],
        page: 1,
        size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      } as CoursePageResponse,
    };
  }
}

export async function getCourseByIdAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.read")) {
    return {
      success: false,
      error: "You do not have permission to view this course.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseItem>>(`/v1/courses/${id}`);
    return {
      success: true,
      data: res.data,
      message: res.message,
    };
  } catch (error) {
    console.error(`Failed to fetch course ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to load course details. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createCourseAction(payload: CreateCoursePayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.create")) {
    return {
      success: false,
      error: "You do not have permission to create courses.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseItem>>("/v1/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    revalidatePath("/courses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "Course created successfully",
    };
  } catch (error) {
    console.error("Failed to create course:", error);
    const message =
      error instanceof ApiError ? error.message : "Failed to create course. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateCourseAction(id: number | string, payload: UpdateCoursePayload) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.update")) {
    return {
      success: false,
      error: "You do not have permission to update courses.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseItem>>(`/v1/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    revalidatePath("/courses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "Course updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update course ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to update course. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteCourseAction(id: number | string) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.delete")) {
    return {
      success: false,
      error: "You do not have permission to delete courses.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<void>>(`/v1/courses/${id}`, {
      method: "DELETE",
    });

    revalidatePath("/courses");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: res?.message || "Course deleted successfully",
    };
  } catch (error) {
    console.error(`Failed to delete course ${id}:`, error);
    const message =
      error instanceof ApiError ? error.message : "Failed to delete course. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
export async function getCourseTranslationByLanguageAction(
  courseId: number | string,
  langCode: string
) {
  try {
    const res = await apiFetch<ApiResponse<CourseItem>>(
      `/v1/courses/${courseId}/language/${encodeURIComponent(langCode)}`
    );

    return {
      success: true,
      data: res?.data,
      message: res?.message,
    };
  } catch (error) {
    console.error(`Failed to fetch translation for course ${courseId} language ${langCode}:`, error);
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to load translation for the selected language.";
    return {
      success: false,
      error: message,
    };
  }
}

export type UpdateCourseTranslationPayload = {
  language: string;
  courseName: string;
  courseDetails: string;
  courseLevel?: string;
  duration?: string;
  categoryId?: string;
  categoryName?: string;
  courseId?: string;
  points?: number;
  noOfVideos?: number;
  noOfCertifications?: string;
  imageUrl?: string;
  mode?: string;
  status?: string;
  languages?: unknown[];
  [key: string]: unknown;
};

export async function updateCourseTranslationAction(
  courseId: number | string,
  payload: UpdateCourseTranslationPayload
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["courses.update", "courses.create"])) {
    return {
      success: false,
      error: "You do not have permission to update course translations.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseItem>>(
      `/v1/courses/${courseId}/translations`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    revalidatePath(`/courses/${courseId}`);
    revalidatePath("/courses");

    return {
      success: true,
      data: res?.data,
      message: res?.message || "Course translation updated successfully",
    };
  } catch (error) {
    console.error(`Failed to update translation for course ${courseId}:`, error);
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to update course translation. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function exportCoursesAction() {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, ["courses.export", "courses.read"])) {
    return {
      success: false,
      error: "You do not have permission to export courses.",
    };
  }

  try {
    const { cookies } = await import("next/headers");
    const { ACCESS_COOKIE } = await import("@/lib/auth-cookies");
    const { config } = await import("@/config/env");

    const token = (await cookies()).get(ACCESS_COOKIE)?.value;

    const res = await fetch(`${config.apiBaseUrl}/v1/courses/export`, {
      method: "GET",
      headers: {
        Accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Export failed with status: ${res.status}`);
    }

    const csvContent = await res.text();

    return {
      success: true,
      data: csvContent,
      filename: `courses_export_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  } catch (error) {
    console.error("Failed to export courses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export courses.",
    };
  }
}

export type CourseVideoItem = {
  videoId: number;
  sequenceNo: number;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  duration?: string;
  points?: number;
  isQuizPresent?: boolean;
  courseId: number;
  courseName?: string;
  languageId?: string;
  languageName?: string;
};

export async function getCourseVideosAction(params: {
  courseId: number | string;
  languageId?: string;
}) {
  try {
    const res = await apiFetch<ApiResponse<CourseVideoItem[]>>("/v1/course/videos", {
      method: "POST",
      body: JSON.stringify({
        courseId: Number(params.courseId) || params.courseId,
        languageId: params.languageId || "",
      }),
    });

    return {
      success: true,
      data: Array.isArray(res?.data) ? res.data : [],
      message: res?.message,
    };
  } catch (error) {
    console.error("Failed to fetch course videos:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to load course videos.",
      data: [],
    };
  }
}
