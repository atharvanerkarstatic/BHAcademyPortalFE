"use server";

import { ENDPOINTS } from "@/config/endpoints";
import { apiFetchText, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import { getAllLanguagesAction } from "@/features/languages/action";
import { getCoursesAction } from "@/features/courses/action";
import { getTrainersAction } from "@/features/trainers/action";

export type ExportReportResult = {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
  message?: string;
};

async function fetchCsvReport(pathWithQuery: string, defaultFilename: string): Promise<ExportReportResult> {
  const user = await getCurrentUser();
  const userPerms = user ? [...user.roles, ...user.permissions] : [];

  if (
    !hasPermission(userPerms, [
      "audit.read",
      "reports.read",
      "courses.read",
      "system.all",
    ])
  ) {
    return {
      success: false,
      error: "You do not have permission to generate reports.",
    };
  }

  try {
    const { text, contentDisposition } = await apiFetchText(pathWithQuery);

    let filename = defaultFilename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
      if (match?.[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    return {
      success: true,
      data: text,
      filename,
      message: "Report generated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof ApiError || error instanceof Error ? error.message : "Failed to generate report.",
    };
  }
}

export type ParticipantsReportParams = {
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
};

export async function exportParticipantsResultAction(params: ParticipantsReportParams): Promise<ExportReportResult> {
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

  return fetchCsvReport(
    `${ENDPOINTS.reports.participantsExport}?${query.toString()}`,
    "participants-result.csv"
  );
}

export type OnDemandVideoReportParams = {
  courseId?: string;
  startDate?: string;
  endDate?: string;
  languageId?: string;
};

export async function exportOnDemandVideoAction(params: OnDemandVideoReportParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    languageId: params.languageId ?? "",
  });

  return fetchCsvReport(
    `${ENDPOINTS.reports.onDemandVideoExport}?${query.toString()}`,
    "on-demand-video-pending-assessment.csv"
  );
}

export type VirtualTrainingDivisionReportParams = {
  division?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
};

export async function exportVirtualTrainingDivisionAction(params: VirtualTrainingDivisionReportParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    division: params.division ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return fetchCsvReport(
    `${ENDPOINTS.reports.virtualTrainingDivisionExport}?${query.toString()}`,
    "virtual-training-division.csv"
  );
}

export type VirtualTrainingRegionReportParams = {
  region?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
};

export async function exportVirtualTrainingRegionAction(params: VirtualTrainingRegionReportParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    region: params.region ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return fetchCsvReport(
    `${ENDPOINTS.reports.virtualTrainingRegionExport}?${query.toString()}`,
    "virtual-training-region.csv"
  );
}

export type CourseWiseAssessmentReportParams = {
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  trainerId?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
};

export async function exportCourseWiseAssessmentAction(params: CourseWiseAssessmentReportParams): Promise<ExportReportResult> {
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

  return fetchCsvReport(
    `${ENDPOINTS.reports.moduleWiseSummaryExport}?${query.toString()}`,
    "module-wise-assessment.csv"
  );
}

export type TrainerAccessLogsParams = {
  startDate?: string;
  endDate?: string;
  trainerId?: string;
};

export async function exportTrainerAccessLogsAction(params: TrainerAccessLogsParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    trainerId: params.trainerId ?? "",
  });

  return fetchCsvReport(
    `${ENDPOINTS.reports.trainerAccessLogsExport}?${query.toString()}`,
    "trainer-access-logs.csv"
  );
}

export type TrainerIpReportParams = {
  startDate?: string;
  endDate?: string;
  trainerId?: string;
};

export async function exportTrainerIpReportAction(params: TrainerIpReportParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    trainerId: params.trainerId ?? "",
  });

  return fetchCsvReport(
    `${ENDPOINTS.reports.trainerIpReportExport}?${query.toString()}`,
    "trainer-ip-report.csv"
  );
}

export type ReportFilterOptions = {
  userEmail: string;
  languages: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string }>;
};

export async function getReportFilterOptionsAction(): Promise<ReportFilterOptions> {
  const user = await getCurrentUser();
  const [langRes, coursesRes, trainersRes] = await Promise.all([
    getAllLanguagesAction(),
    getCoursesAction({ size: 200 }),
    getTrainersAction({ size: 200 }),
  ]);

  return {
    userEmail: user?.email || "satyam.pattnaik@stetig.in",
    languages:
      langRes.success && Array.isArray(langRes.data)
        ? langRes.data.map((lang, idx) => {
            const id = lang.languageId ?? String(idx + 1);
            return {
              id: String(id),
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
