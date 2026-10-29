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
  id?: number;
  videoId: number | string;
  sequenceNo: number;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  duration?: string;
  points?: number;
  isQuizPresent?: boolean;
  status?: string;
  courseId: number;
  courseName?: string;
  languageId?: number | string;
  languageName?: string;
};

export async function getCourseVideosAction(params: {
  courseId: number | string;
  languageId?: number | string;
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

export type CourseImportError = {
  rowNumber?: number;
  identifier?: string;
  field?: string;
  rejectedValue?: string | number | null;
  errorMessage: string;
};

export type CourseImportResponse = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors?: CourseImportError[];
};

export async function importCourseTranslationsAction(
  courseId: string | number,
  languageCode: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (!hasPermission(userPerms, "courses.import") && !hasPermission(userPerms, "courses.update")) {
    return {
      success: false,
      error: "You do not have permission to import course translations.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseImportResponse>>(
      `/v1/courses/${encodeURIComponent(courseId)}/import/language/${encodeURIComponent(languageCode)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    revalidatePath(`/courses/${courseId}`);
    return {
      success: true,
      data: res.data,
      message: res.message || "Course translations imported successfully",
    };
  } catch (error) {
    console.error("Failed to import course translations:", error);
    if (error instanceof ApiError && error.data) {
      return {
        success: false,
        error: error.message || "Failed to import course translations.",
        data: error.data as CourseImportResponse,
      };
    }
    const message =
      error instanceof ApiError ? error.message : "Failed to import course translations.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function importCourseVideosAction(
  courseId: string | number,
  languageCode: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "courses.import") &&
    !hasPermission(userPerms, "courses.update") &&
    !hasPermission(userPerms, "videos.create") &&
    !hasPermission(userPerms, "videos.update")
  ) {
    return {
      success: false,
      error: "You do not have permission to import course videos.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseImportResponse>>(
      `/v1/courses/${encodeURIComponent(courseId)}/videos/import/language/${encodeURIComponent(languageCode)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    revalidatePath(`/courses/${courseId}`);
    return {
      success: true,
      data: res.data,
      message: res.message || "Course videos imported successfully",
    };
  } catch (error) {
    console.error("Failed to import course videos:", error);
    if (error instanceof ApiError && error.data) {
      return {
        success: false,
        error: error.message || "Failed to import course videos.",
        data: error.data as CourseImportResponse,
      };
    }
    const message =
      error instanceof ApiError ? error.message : "Failed to import course videos.";
    return {
      success: false,
      error: message,
    };
  }
}

export type SaveVideoPayload = {
  sequenceNo: number;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  duration?: string;
  points?: number;
  isQuizPresent?: boolean;
  courseId: number | string;
  languageId?: number | string;
};

export async function getCourseVideosByLangAction(
  courseId: number | string,
  languageCode: string
) {
  try {
    const res = await apiFetch<ApiResponse<CourseVideoItem[]>>(
      `/v1/courses/${encodeURIComponent(courseId)}/languages/${encodeURIComponent(languageCode)}/videos`,
      {
        method: "GET",
      }
    );

    return {
      success: true,
      data: Array.isArray(res?.data) ? res.data : [],
      message: res?.message,
    };
  } catch (error) {
    console.error("Failed to fetch course videos by language:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to load course videos.",
      data: [] as CourseVideoItem[],
    };
  }
}

export async function createCourseVideoAction(
  courseId: number | string,
  languageCode: string,
  payload: SaveVideoPayload
) {
  try {
    const res = await apiFetch<ApiResponse<CourseVideoItem>>(
      `/v1/courses/${encodeURIComponent(courseId)}/language/${encodeURIComponent(languageCode)}/videos`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    revalidatePath(`/courses/${courseId}`);
    return {
      success: true,
      data: res.data,
      message: res.message || "Video created successfully",
    };
  } catch (error) {
    console.error("Failed to create course video:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to create video.",
    };
  }
}

export async function updateSingleVideoAction(
  courseId: number | string,
  languageCode: string,
  videoId: number | string,
  payload: SaveVideoPayload
) {
  try {
    const res = await apiFetch<ApiResponse<CourseVideoItem>>(
      `/v1/courses/${encodeURIComponent(courseId)}/languages/${encodeURIComponent(languageCode)}/video/${encodeURIComponent(videoId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    const targetCourseId = payload.courseId || courseId;
    if (targetCourseId) {
      revalidatePath(`/courses/${targetCourseId}`);
    }
    return {
      success: true,
      data: res.data,
      message: res.message || "Video updated successfully",
    };
  } catch (error) {
    console.error("Failed to update video:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to update video.",
    };
  }
}

export async function deleteCourseVideoAction(
  videoId: number | string,
  courseId?: number | string
) {
  try {
    const res = await apiFetch<ApiResponse<void>>(
      `/v1/video/${encodeURIComponent(videoId)}`,
      {
        method: "DELETE",
      }
    );

    if (courseId) {
      revalidatePath(`/courses/${courseId}`);
    }
    return {
      success: true,
      message: res.message || "Video deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete video:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to delete video.",
    };
  }
}

export type CourseQuizItem = {
  quizId?: number | string;
  id?: number | string;
  question: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  quizName?: string;
  questionType?: string;
  answer1Desc?: string;
  answer2Desc?: string;
  answer3Desc?: string;
  answer4Desc?: string;
  answer1Url?: string;
  answer2Url?: string;
  answer3Url?: string;
  answer4Url?: string;
  correctAnswer: string;
  points?: number;
  assessmentFlag?: boolean;
  quizIdString?: string;
  questionImageUrl?: string;
  status?: string;
  isDeleted?: boolean;
  courseId?: number | string;
  courseName?: string;
  videoId?: number | string;
  videoName?: string;
  languageId?: number | string;
  languageName?: string;
};

export type CreateQuizPayload = {
  question: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  quizName?: string;
  questionType?: string;
  answer1Desc?: string;
  answer2Desc?: string;
  answer3Desc?: string;
  answer4Desc?: string;
  answer1Url?: string;
  answer2Url?: string;
  answer3Url?: string;
  answer4Url?: string;
  correctAnswer: string;
  points?: number;
  assessmentFlag?: boolean;
  quizId?: string;
  questionImageUrl?: string;
  status?: string;
  courseId: number | string;
  videoId?: number | string | null;
  languageId?: number | string;
};

export async function getCourseQuizzesAction(
  courseId: number | string,
  languageCode: string
) {
  try {
    const res = await apiFetch<ApiResponse<CourseQuizItem[]>>(
      `/v1/courses/${encodeURIComponent(courseId)}/languages/${encodeURIComponent(languageCode)}/quizzes`,
      {
        method: "GET",
      }
    );

    return {
      success: true,
      data: Array.isArray(res?.data) ? res.data : [],
      message: res?.message || "Quizzes fetched successfully",
    };
  } catch (error) {
    console.error("Failed to fetch course quizzes:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to load course quizzes.",
      data: [] as CourseQuizItem[],
    };
  }
}

export async function createQuizAction(payload: CreateQuizPayload) {
  try {
    const res = await apiFetch<ApiResponse<CourseQuizItem>>(
      `/v1/quiz`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (payload.courseId) {
      revalidatePath(`/courses/${payload.courseId}`);
    }
    return {
      success: true,
      data: res.data,
      message: res.message || "Quiz created successfully",
    };
  } catch (error) {
    console.error("Failed to create quiz:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to create quiz.",
    };
  }
}

export async function updateQuizAction(
  quizId: number | string,
  payload: CreateQuizPayload
) {
  try {
    const res = await apiFetch<ApiResponse<CourseQuizItem>>(
      `/v1/quiz/${encodeURIComponent(quizId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );

    if (payload.courseId) {
      revalidatePath(`/courses/${payload.courseId}`);
    }
    return {
      success: true,
      data: res.data,
      message: res.message || "Quiz updated successfully",
    };
  } catch (error) {
    console.error("Failed to update quiz:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to update quiz.",
    };
  }
}

export async function deleteQuizAction(
  quizId: number | string,
  courseId?: number | string
) {
  try {
    const res = await apiFetch<ApiResponse<void>>(
      `/v1/quizzes/${encodeURIComponent(quizId)}`,
      {
        method: "DELETE",
      }
    );

    if (courseId) {
      revalidatePath(`/courses/${courseId}`);
    }
    return {
      success: true,
      message: res.message || "Quiz deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete quiz:", error);
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Failed to delete quiz.",
    };
  }
}

export async function importCourseQuizzesAction(
  courseId: string | number,
  languageCode: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, "courses.import") &&
    !hasPermission(userPerms, "courses.update") &&
    !hasPermission(userPerms, "faqs.create") &&
    !hasPermission(userPerms, "system.all") &&
    !hasPermission(userPerms, "ROLE_ADMINISTRATOR")
  ) {
    return {
      success: false,
      error: "You do not have permission to import course quizzes.",
    };
  }

  try {
    const res = await apiFetch<ApiResponse<CourseImportResponse>>(
      `/v1/courses/${encodeURIComponent(courseId)}/quiz/import/language/${encodeURIComponent(languageCode)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    revalidatePath(`/courses/${courseId}`);
    return {
      success: true,
      data: res.data,
      message: res.message || "Quiz questions imported successfully",
    };
  } catch (error) {
    console.error("Failed to import course quizzes:", error);
    if (error instanceof ApiError && error.data) {
      return {
        success: false,
        error: error.message || "Failed to import quiz questions.",
        data: error.data as CourseImportResponse,
      };
    }
    const message =
      error instanceof ApiError ? error.message : "Failed to import quiz questions.";
    return {
      success: false,
      error: message,
    };
  }
}


