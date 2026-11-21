"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetch, apiFetchText } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";
import { createEmptyPage, isRecord } from "@/lib/type-guards";

import type {
  ApiResponse,
  CoursePageResponse,
  CourseItem,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "./types";

export interface GetCoursesParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function getCoursesAction(
  params: GetCoursesParams = {},
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: createEmptyPage<CourseItem>(
        params.size ?? 10
      ) satisfies CoursePageResponse,
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

  const res = await tryCatch(
    apiFetch<ApiResponse<CoursePageResponse>>(
      `${ENDPOINTS.courses.list}?${searchParams.toString()}`,
      { signal: options?.signal }
    ),
    "Failed to load courses. Please try again."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load courses. Please try again.",
      data: createEmptyPage<CourseItem>(size) satisfies CoursePageResponse,
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function getCategoryCoursesAction(
  categoryId: string | number,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [] as Array<CourseItem>,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<Array<CourseItem>>>(
      ENDPOINTS.courses.byCategory(categoryId),
      {
        signal: options?.signal,
      }
    ),
    "Failed to load courses. Please try again."
  );

  if (!res.ok) {
    console.error(
      `Failed to fetch courses for category ${categoryId}:`,
      res.error.cause
    );
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load courses. Please try again.",
      data: [] as Array<CourseItem>,
    };
  }

  return {
    success: true,
    data: res.data.data ?? [],
    message: res.data.message,
  };
}

export async function getCourseByIdAction(
  id: number | string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view this course."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseItem>>(ENDPOINTS.courses.byId(id), {
      signal: options?.signal,
    }),
    "Failed to load course details. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to fetch course ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load course details. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message,
  };
}

export async function createCourseAction(payload: CreateCoursePayload) {
  const auth = await requirePermission(
    "courses.create",
    "You do not have permission to create courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseItem>>(ENDPOINTS.courses.list, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Failed to create course. Please try again."
  );

  if (!res.ok) {
    console.error("Failed to create course:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create course. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Course created successfully",
  };
}

export async function updateCourseAction(
  id: number | string,
  payload: UpdateCoursePayload
) {
  const auth = await requirePermission(
    "courses.update",
    "You do not have permission to update courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseItem>>(ENDPOINTS.courses.byId(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    "Failed to update course. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to update course ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update course. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Course updated successfully",
  };
}

export async function toggleCourseStatusAction(id: number | string) {
  const auth = await requirePermission(
    ["courses.update", "system.all"],
    "You do not have permission to update courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<string>>(ENDPOINTS.courses.toggleStatus(id), {
      method: "PATCH",
    }),
    "Failed to toggle course status. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to toggle status for course ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to toggle course status. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Course status updated successfully",
  };
}

export async function deleteCourseAction(id: number | string) {
  const auth = await requirePermission(
    "courses.delete",
    "You do not have permission to delete courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.courses.byId(id), {
      method: "DELETE",
    }),
    "Failed to delete course. Please try again."
  );

  if (!res.ok) {
    console.error(`Failed to delete course ${id}:`, res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete course. Please try again.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Course deleted successfully",
  };
}

export async function getCourseTranslationByLanguageAction(
  courseId: number | string,
  langCode: string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view course translations."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseItem>>(
      ENDPOINTS.courses.translationByLang(courseId, langCode),
      {
        signal: options?.signal,
      }
    ),
    "Failed to load translation for the selected language."
  );

  if (!res.ok) {
    console.error(
      `Failed to fetch translation for course ${courseId} language ${langCode}:`,
      res.error.cause
    );
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load translation for the selected language.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message,
  };
}

export interface UpdateCourseTranslationPayload {
  language: string;
  courseName: string;
  courseDetails: string;
  courseLevel?: string;
  duration?: string;
}

export async function updateCourseTranslationAction(
  courseId: number | string,
  payload: UpdateCourseTranslationPayload
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to update course translations."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  // Exact request body required by PUT /v1/courses/{courseId}/translations
  const requestBody = {
    language: payload.language,
    courseName: payload.courseName,
    courseDetails: payload.courseDetails || "",
    courseLevel: payload.courseLevel || "BEGINNER",
    duration: payload.duration || "",
  };

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseItem>>(
      ENDPOINTS.courses.translations(courseId),
      {
        method: "PUT",
        body: JSON.stringify(requestBody),
      }
    ),
    "Failed to update course translation. Please try again."
  );

  if (!res.ok) {
    console.error(
      `Failed to update translation for course ${courseId}:`,
      res.error.cause
    );
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update course translation. Please try again.",
    };
  }

  return {
    success: true,
    data: res.data?.data,
    message: res.data?.message || "Course translation updated successfully",
  };
}

export async function exportCoursesAction() {
  const auth = await requirePermission(
    ["courses.export", "courses.read"],
    "You do not have permission to export courses."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetchText(ENDPOINTS.courses.export),
    "Failed to export courses."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.message,
    };
  }

  return {
    success: true,
    data: res.data.text,
    filename: `courses_export_${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export interface CourseVideoItem {
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
}

export async function getCourseVideosAction(
  params: {
    courseId: number | string;
    languageId?: number | string;
  },
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [] as Array<CourseVideoItem>,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<Array<CourseVideoItem>>>(
      ENDPOINTS.courses.videosPost,
      {
        method: "POST",
        body: JSON.stringify({
          courseId: Number(params.courseId) || params.courseId,
          languageId: params.languageId || "",
        }),
        signal: options?.signal,
      }
    ),
    "Failed to load course videos."
  );

  if (!res.ok) {
    console.error("Failed to fetch course videos:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load course videos.",
      data: [] as Array<CourseVideoItem>,
    };
  }

  return {
    success: true,
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    message: res.data?.message,
  };
}

export interface CourseImportError {
  rowNumber?: number;
  identifier?: string;
  field?: string;
  rejectedValue?: string | number | null;
  errorMessage: string;
}

export interface CourseImportResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors?: Array<CourseImportError>;
}

function parseCourseImportError(item: unknown): CourseImportError | null {
  if (
    !isRecord(item) ||
    !("errorMessage" in item) ||
    typeof item.errorMessage !== "string"
  ) {
    return null;
  }
  const rawRejected = "rejectedValue" in item ? item.rejectedValue : undefined;
  const rejectedValue =
    typeof rawRejected === "string" ||
    typeof rawRejected === "number" ||
    rawRejected === null
      ? rawRejected
      : undefined;
  return {
    rowNumber:
      "rowNumber" in item && typeof item.rowNumber === "number"
        ? item.rowNumber
        : undefined,
    identifier:
      "identifier" in item && typeof item.identifier === "string"
        ? item.identifier
        : undefined,
    field:
      "field" in item && typeof item.field === "string"
        ? item.field
        : undefined,
    rejectedValue,
    errorMessage: item.errorMessage,
  };
}

function parseCourseImportResponse(
  value: unknown
): CourseImportResponse | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const source = "data" in value && isRecord(value.data) ? value.data : value;
  const totalRows =
    "totalRows" in source && typeof source.totalRows === "number"
      ? source.totalRows
      : undefined;
  const successCount =
    "successCount" in source && typeof source.successCount === "number"
      ? source.successCount
      : undefined;
  const failureCount =
    "failureCount" in source && typeof source.failureCount === "number"
      ? source.failureCount
      : undefined;
  const rawErrors =
    "errors" in source && Array.isArray(source.errors)
      ? source.errors
      : undefined;
  if (
    totalRows === undefined &&
    successCount === undefined &&
    failureCount === undefined &&
    rawErrors === undefined
  ) {
    return undefined;
  }
  const errors = rawErrors
    ?.map(parseCourseImportError)
    .filter((entry): entry is CourseImportError => entry !== null);
  return {
    totalRows: totalRows ?? 0,
    successCount: successCount ?? 0,
    failureCount: failureCount ?? 0,
    errors,
  };
}

export async function importCourseTranslationsAction(
  courseIdentifier: string | number,
  formData: FormData
) {
  const auth = await requirePermission(
    ["courses.import", "courses.update"],
    "You do not have permission to import course translations."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseImportResponse>>(
      ENDPOINTS.courses.importTranslations(courseIdentifier),
      {
        method: "POST",
        body: formData,
      }
    ),
    "Failed to import course translations."
  );

  if (!res.ok) {
    console.error("Failed to import course translations:", res.error.cause);
    const parsedImportData = res.error.isApiError
      ? parseCourseImportResponse(res.error.data)
      : undefined;
    if (parsedImportData) {
      return {
        success: false,
        error: res.error.message || "Failed to import course translations.",
        data: parsedImportData,
      };
    }
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to import course translations.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Course translations imported successfully",
  };
}

export async function importCourseVideosAction(
  courseIdentifier: string | number,
  formData: FormData
) {
  const auth = await requirePermission(
    ["courses.import", "courses.update", "videos.create", "videos.update"],
    "You do not have permission to import course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseImportResponse>>(
      ENDPOINTS.courses.importVideos(courseIdentifier),
      {
        method: "POST",
        body: formData,
      }
    ),
    "Failed to import course videos."
  );

  if (!res.ok) {
    console.error("Failed to import course videos:", res.error.cause);
    const parsedImportData = res.error.isApiError
      ? parseCourseImportResponse(res.error.data)
      : undefined;
    if (parsedImportData) {
      return {
        success: false,
        error: res.error.message || "Failed to import course videos.",
        data: parsedImportData,
      };
    }
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to import course videos.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Course videos imported successfully",
  };
}

export interface SaveVideoPayload {
  sequenceNo: number;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  duration?: string;
  points?: number;
  isQuizPresent?: boolean;
  status?: string;
  courseId: number | string;
  languageId?: number | string;
}

export async function getCourseVideosByLangAction(
  courseId: number | string,
  languageCode: string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [] as Array<CourseVideoItem>,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<Array<CourseVideoItem>>>(
      ENDPOINTS.courses.videosByLang(courseId, languageCode),
      {
        method: "GET",
        signal: options?.signal,
      }
    ),
    "Failed to load course videos."
  );

  if (!res.ok) {
    console.error(
      "Failed to fetch course videos by language:",
      res.error.cause
    );
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load course videos.",
      data: [] as Array<CourseVideoItem>,
    };
  }

  return {
    success: true,
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    message: res.data?.message,
  };
}

export async function createCourseVideoAction(
  courseId: number | string,
  languageCode: string,
  payload: SaveVideoPayload
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to create course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseVideoItem>>(
      ENDPOINTS.courses.createVideoByLang(courseId, languageCode),
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
    "Failed to create video."
  );

  if (!res.ok) {
    console.error("Failed to create course video:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create video.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Video created successfully",
  };
}

export async function updateSingleVideoAction(
  courseId: number | string,
  languageCode: string,
  videoId: number | string,
  payload: SaveVideoPayload
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to update course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseVideoItem>>(
      ENDPOINTS.courses.updateVideoByLang(courseId, languageCode, videoId),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),
    "Failed to update video."
  );

  if (!res.ok) {
    console.error("Failed to update video:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update video.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Video updated successfully",
  };
}

export async function deleteCourseVideoAction(
  videoId: number | string,
  _courseId?: number | string
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to delete course videos."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.courses.deleteVideo(videoId), {
      method: "DELETE",
    }),
    "Failed to delete video."
  );

  if (!res.ok) {
    console.error("Failed to delete video:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete video.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Video deleted successfully",
  };
}

export interface CourseQuizItem {
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
}

export interface CreateQuizPayload {
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
}

export async function getCourseQuizzesAction(
  courseId: number | string,
  languageCode: string,
  quizType?: string,
  options?: ActionRequestOptions
) {
  const auth = await requirePermission(
    "courses.read",
    "You do not have permission to view course quizzes."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
      data: [] as Array<CourseQuizItem>,
    };
  }

  const query = quizType ? `?quizType=${encodeURIComponent(quizType)}` : "";
  const res = await tryCatch(
    apiFetch<ApiResponse<Array<CourseQuizItem>>>(
      `${ENDPOINTS.courses.quizzesByLang(courseId, languageCode)}${query}`,
      {
        method: "GET",
        signal: options?.signal,
      }
    ),
    "Failed to load course quizzes."
  );

  if (!res.ok) {
    console.error("Failed to fetch course quizzes:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to load course quizzes.",
      data: [] as Array<CourseQuizItem>,
    };
  }

  return {
    success: true,
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    message: res.data?.message || "Quizzes fetched successfully",
  };
}

export async function createQuizAction(payload: CreateQuizPayload) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to create quizzes."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseQuizItem>>(ENDPOINTS.courses.quizCreate, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Failed to create quiz."
  );

  if (!res.ok) {
    console.error("Failed to create quiz:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to create quiz.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Quiz created successfully",
  };
}

export async function updateQuizAction(
  quizId: number | string,
  payload: CreateQuizPayload
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to update quizzes."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseQuizItem>>(
      ENDPOINTS.courses.quizUpdate(quizId),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),
    "Failed to update quiz."
  );

  if (!res.ok) {
    console.error("Failed to update quiz:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to update quiz.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Quiz updated successfully",
  };
}

export async function deleteQuizAction(
  quizId: number | string,
  _courseId?: number | string
) {
  const auth = await requirePermission(
    ["courses.update", "courses.create"],
    "You do not have permission to delete quizzes."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<void>>(ENDPOINTS.courses.quizDelete(quizId), {
      method: "DELETE",
    }),
    "Failed to delete quiz."
  );

  if (!res.ok) {
    console.error("Failed to delete quiz:", res.error.cause);
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to delete quiz.",
    };
  }

  return {
    success: true,
    message: res.data?.message || "Quiz deleted successfully",
  };
}

export async function importCourseQuizzesAction(
  courseIdentifier: string | number,
  formData: FormData
) {
  const auth = await requirePermission(
    [
      "courses.import",
      "courses.update",
      "faqs.create",
      "system.all",
      "ROLE_ADMINISTRATOR",
    ],
    "You do not have permission to import course quizzes."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetch<ApiResponse<CourseImportResponse>>(
      ENDPOINTS.courses.importQuizzes(courseIdentifier),
      {
        method: "POST",
        body: formData,
      }
    ),
    "Failed to import quiz questions."
  );

  if (!res.ok) {
    console.error("Failed to import course quizzes:", res.error.cause);
    const parsedImportData = res.error.isApiError
      ? parseCourseImportResponse(res.error.data)
      : undefined;
    if (parsedImportData) {
      return {
        success: false,
        error: res.error.message || "Failed to import quiz questions.",
        data: parsedImportData,
      };
    }
    return {
      success: false,
      error: res.error.isApiError
        ? res.error.message
        : "Failed to import quiz questions.",
    };
  }

  return {
    success: true,
    data: res.data.data,
    message: res.data.message || "Quiz questions imported successfully",
  };
}
