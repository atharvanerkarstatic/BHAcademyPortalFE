"use server";

import { cookies } from "next/headers";
import { config } from "@/config/env";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { getCurrentUser } from "@/lib/auth-server";
import { hasPermission } from "@/lib/auth-jwt";
import { getAllLanguagesAction } from "@/features/languages/action";
import { getCoursesAction } from "@/features/courses/action";

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

  if (!hasPermission(userPerms, "audit.read") && !hasPermission(userPerms, "courses.read") && !hasPermission(userPerms, "system.all")) {
    return {
      success: false,
      error: "You do not have permission to generate reports.",
    };
  }

  const token = (await cookies()).get(ACCESS_COOKIE)?.value;

  try {
    const res = await fetch(`${config.apiBaseUrl}${pathWithQuery}`, {
      headers: {
        accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errMsg = `Failed to generate report (${res.status})`;
      try {
        const json = await res.json();
        if (json?.message) errMsg = json.message;
        else if (json?.error) errMsg = json.error;
      } catch {
        const text = await res.text();
        if (text) errMsg = text;
      }
      return { success: false, error: errMsg };
    }

    const disposition = res.headers.get("content-disposition");
    let filename = defaultFilename;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    const csvData = await res.text();
    return {
      success: true,
      data: csvData,
      filename,
      message: "Report generated successfully.",
    };
  } catch (err: unknown) {
    console.error("Report export failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to report server.",
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

  return fetchCsvReport(`/v1/report/participants/export?${query.toString()}`, "participants-result.csv");
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

  return fetchCsvReport(`/v1/report/on-demand-video/export?${query.toString()}`, "on-demand-video-pending-assessment.csv");
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

  return fetchCsvReport(`/v1/report/virtual-training-division/export?${query.toString()}`, "virtual-training-division.csv");
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

  return fetchCsvReport(`/v1/report/virtual-training-region/export?${query.toString()}`, "virtual-training-region.csv");
}

export type CourseWiseAssessmentReportParams = {
  modeOfTraining?: string;
  division?: string;
  region?: string;
  languageId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
};

export async function exportCourseWiseAssessmentAction(params: CourseWiseAssessmentReportParams): Promise<ExportReportResult> {
  const query = new URLSearchParams({
    modeOfTraining: params.modeOfTraining ?? "",
    division: params.division ?? "",
    region: params.region ?? "",
    languageId: params.languageId ?? "",
    courseId: params.courseId ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  });

  return fetchCsvReport(`/v1/report/module-wise-summary/export?${query.toString()}`, "module-wise-assessment.csv");
}

export async function getReportFilterOptionsAction() {
  const [langRes, coursesRes] = await Promise.all([
    getAllLanguagesAction(),
    getCoursesAction({ size: 200 }),
  ]);

  return {
    languages:
      langRes.success && Array.isArray(langRes.data)
        ? langRes.data.map((l: any, idx: number) => {
            const id = l.languageId ?? l.id ?? String(idx + 1);
            return {
              id: String(id),
              name: l.language || l.languageCode || `Language ${id}`,
            };
          })
        : [],
    courses:
      coursesRes.success && coursesRes.data?.content
        ? coursesRes.data.content.map((c: any, idx: number) => {
            const id = c.id ?? c.courseId ?? String(idx + 1);
            return {
              id: String(id),
              name: c.courseName || `Course #${id}`,
            };
          })
        : [],
  };
}
