"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { getCoursesAction } from "@/features/courses/action";
import { getAllLanguagesAction } from "@/features/languages/action";
import { getTrainersAction } from "@/features/trainers/action";
import { apiFetchText } from "@/lib/api";
import type { ActionRequestOptions } from "@/lib/api";
import { getCurrentUser, requirePermission } from "@/lib/auth-server";
import { tryCatch } from "@/lib/try-catch";

export interface ExportReportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
  message?: string;
}

function parseFilenameFromContentDisposition(
  contentDisposition: string
): string | null {
  for (const rawPart of contentDisposition.split(";")) {
    const part = rawPart.trim();
    if (!/^filename\*?=/iu.test(part)) {
      continue;
    }

    const rawValue = part.replace(/^filename\*?=/iu, "").trim();
    const extracted = rawValue
      .replace(/^['"]+/u, "")
      .replace(/^UTF-\d['"]*/iu, "")
      .replace(/['"\r\n]+$/u, "");

    if (extracted) {
      try {
        return decodeURIComponent(extracted);
      } catch {
        return extracted;
      }
    }
  }

  return null;
}

async function fetchCsvReport(
  pathWithQuery: string,
  defaultFilename: string
): Promise<ExportReportResult> {
  const auth = await requirePermission(
    ["audit.read", "reports.read", "courses.read", "system.all"],
    "You do not have permission to generate reports."
  );
  if (!auth.ok) {
    return {
      success: false,
      error: auth.error,
    };
  }

  const res = await tryCatch(
    apiFetchText(pathWithQuery),
    "Failed to generate report."
  );

  if (!res.ok) {
    return {
      success: false,
      error: res.error.message,
    };
  }

  const { text, contentDisposition } = res.data;

  const filename =
    (contentDisposition &&
      parseFilenameFromContentDisposition(contentDisposition)) ||
    defaultFilename;

  return {
    success: true,
    data: text,
    filename,
    message: "Report generated successfully",
  };
}

export interface ParticipantsReportParams {
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export async function exportParticipantsResultAction(
  params: ParticipantsReportParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    modeOfTraining: params.modeOfTraining ?? "",
    division: params.division ?? "",
    region: params.region ?? "",
    trainer: params.trainer ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.participantsExport}?${query.toString()}`,
    "participants-result.csv"
  );
}

export interface OnDemandVideoReportParams {
  courseId?: string;
  startDate?: string;
  endDate?: string;
  languageId?: string;
}

export async function exportOnDemandVideoAction(
  params: OnDemandVideoReportParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    languageId: params.languageId ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.onDemandVideoExport}?${query.toString()}`,
    "on-demand-video-pending-assessment.csv"
  );
}

export interface VirtualTrainingDivisionReportParams {
  division?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export async function exportVirtualTrainingDivisionAction(
  params: VirtualTrainingDivisionReportParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    division: params.division ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.virtualTrainingDivisionExport}?${query.toString()}`,
    "virtual-training-division.csv"
  );
}

export interface VirtualTrainingRegionReportParams {
  region?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export async function exportVirtualTrainingRegionAction(
  params: VirtualTrainingRegionReportParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    region: params.region ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.virtualTrainingRegionExport}?${query.toString()}`,
    "virtual-training-region.csv"
  );
}

export interface CourseWiseAssessmentReportParams {
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  trainerId?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export async function exportCourseWiseAssessmentAction(
  params: CourseWiseAssessmentReportParams
): Promise<ExportReportResult> {
  const trainerVal = params.trainer || params.trainerId || "";
  const query = new URLSearchParams({
    modeOfTraining: params.modeOfTraining ?? "",
    division: params.division ?? "",
    region: params.region ?? "",
    trainer: trainerVal,
    trainerId: trainerVal,
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.moduleWiseSummaryExport}?${query.toString()}`,
    "module-wise-assessment.csv"
  );
}

export interface TrainerAccessLogsParams {
  startDate?: string;
  endDate?: string;
  trainerId?: string;
}

export async function exportTrainerAccessLogsAction(
  params: TrainerAccessLogsParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    trainerId: params.trainerId ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.trainerAccessLogsExport}?${query.toString()}`,
    "trainer-access-logs.csv"
  );
}

export interface TrainerIpReportParams {
  startDate?: string;
  endDate?: string;
  trainerId?: string;
}

export async function exportTrainerIpReportAction(
  params: TrainerIpReportParams
): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    trainerId: params.trainerId ?? "",
  });

  return await fetchCsvReport(
    `${ENDPOINTS.reports.trainerIpReportExport}?${query.toString()}`,
    "trainer-ip-report.csv"
  );
}

export interface ReportFilterOptions {
  userEmail: string;
  languages: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string }>;
}

export async function getReportFilterOptionsAction(
  options?: ActionRequestOptions
): Promise<ReportFilterOptions> {
  const user = await getCurrentUser();
  const [langRes, coursesRes, trainersRes] = await Promise.all([
    getAllLanguagesAction(options),
    getCoursesAction({ size: 200 }, options),
    getTrainersAction({ size: 200 }, options),
  ]);

  return {
    userEmail: user?.email ?? "",
    languages:
      langRes.success && Array.isArray(langRes.data)
        ? langRes.data.map((lang, idx) => {
            const id = lang.languageId ?? String(idx + 1);
            return {
              id,
              name: lang.language || lang.languageCode || `Language ${id}`,
            };
          })
        : [],
    courses:
      coursesRes.success && coursesRes.data?.content
        ? coursesRes.data.content.map((course, idx) => {
            const id = course.id ?? String(idx + 1);
            return {
              id: String(id),
              name: course.courseName || `Course #${id}`,
            };
          })
        : [],
    trainers:
      trainersRes.success && trainersRes.data?.content
        ? trainersRes.data.content.map((trainer, idx) => {
            const id = trainer.id ?? String(idx + 1);
            const name =
              [trainer.firstName, trainer.lastName].filter(Boolean).join(" ") ||
              trainer.email ||
              `Trainer #${id}`;
            return {
              id: String(id),
              name,
            };
          })
        : [],
  };
}
