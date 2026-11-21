import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAccountByIdAction, getAccountsAction } from "@/features/accounts/action";
import {
  getAdminUserByIdAction,
  getAdminUsersAction,
  getRolesPicklistAction,
} from "@/features/admin-users/action";
import {
  getAssessmentLinksAction,
  getAssessmentResultsAction,
} from "@/features/assessments/action";
import { getCategoriesAction, getCategoryByIdAction } from "@/features/categories/action";
import { getCitiesAction, getCityByIdAction } from "@/features/cities/action";
import {
  getCategoryCoursesAction,
  getCourseByIdAction,
  getCourseQuizzesAction,
  getCourseTranslationByLanguageAction,
  getCourseVideosByLangAction,
  getCoursesAction,
} from "@/features/courses/action";
import {
  getAssessmentSummaryDashboardAction,
  getDashboardDataAction,
  getDivisionsAction,
  getModuleWiseDashboardAction,
  getTrainerWiseDashboardAction,
} from "@/features/dashboard/action";
import { getFaqByIdAction, getFaqsAction } from "@/features/faqs/action";
import {
  getAllLanguagesAction,
  getLanguageByIdAction,
  getLanguagesAction,
} from "@/features/languages/action";
import { getCurrentUserProfile } from "@/features/profile/action";
import { getReportFilterOptionsAction } from "@/features/reports/action";
import {
  getRoleByIdAction,
  getRolePermissionsAction,
  getRolesAction,
} from "@/features/roles/action";
import { getTrainerByIdAction, getTrainersAction } from "@/features/trainers/action";

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function jsonNoStore(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: Array<string> }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const sp = request.nextUrl.searchParams;
  const [resource, sub, sub2] = path;

  switch (resource) {
    case "dashboard": {
      const division = sp.get("division");
      return jsonNoStore(await getDashboardDataAction(division));
    }

    case "divisions": {
      return jsonNoStore(await getDivisionsAction());
    }

    case "profile": {
      return jsonNoStore(await getCurrentUserProfile());
    }

    case "report-filters": {
      const data = await getReportFilterOptionsAction();
      return jsonNoStore({ success: true, data });
    }

    case "reports": {
      if (sub === "module-wise") {
        return jsonNoStore(
          await getModuleWiseDashboardAction({
            division: sp.get("division") || null,
            region: sp.get("region") || null,
            trainerId: sp.get("trainerId") || sp.get("trainer") || null,
            trainer: sp.get("trainer") || sp.get("trainerId") || null,
            languageId: sp.get("languageId") || null,
            startDate: sp.get("startDate") || null,
            endDate: sp.get("endDate") || null,
            modeOfTraining: sp.get("modeOfTraining") || "VIRTUAL",
          })
        );
      }
      if (sub === "trainer-wise") {
        return jsonNoStore(
          await getTrainerWiseDashboardAction({
            division: sp.get("division") || null,
            region: sp.get("region") || null,
            languageId: sp.get("languageId") || null,
            courseId: sp.get("courseId") || null,
            startDate: sp.get("startDate") || null,
            endDate: sp.get("endDate") || null,
          })
        );
      }
      if (sub === "assessment-summary") {
        return jsonNoStore(
          await getAssessmentSummaryDashboardAction({
            trainingMode: sp.get("trainingMode") || "PHYSICAL",
            trainerId: sp.get("trainerId") || null,
            languageId: sp.get("languageId") || null,
            courseId: sp.get("courseId") || null,
            startDate: sp.get("startDate") || null,
            endDate: sp.get("endDate") || null,
          })
        );
      }
      return jsonNoStore({ success: false, error: "Unknown report endpoint" }, 404);
    }

    case "courses": {
      if (!sub) {
        return jsonNoStore(
          await getCoursesAction({
            page: parsePositiveInt(sp.get("page"), 1),
            size: parsePositiveInt(sp.get("size"), 10),
            search: sp.get("search") ?? undefined,
            sort: sp.get("sort") ?? "ASC",
          })
        );
      }
      if (sub === "by-category" && sub2) {
        return jsonNoStore(await getCategoryCoursesAction(sub2));
      }
      if (!sub2) {
        return jsonNoStore(await getCourseByIdAction(sub));
      }
      if (sub2 === "videos") {
        return jsonNoStore(await getCourseVideosByLangAction(sub, sp.get("lang") ?? "en"));
      }
      if (sub2 === "quizzes") {
        return jsonNoStore(
          await getCourseQuizzesAction(
            sub,
            sp.get("lang") ?? "en",
            sp.get("quizType") ?? undefined
          )
        );
      }
      if (sub2 === "translation") {
        return jsonNoStore(
          await getCourseTranslationByLanguageAction(sub, sp.get("lang") ?? "en")
        );
      }
      return jsonNoStore({ success: false, error: "Unknown course endpoint" }, 404);
    }

    case "categories": {
      if (sub) {
        return jsonNoStore(await getCategoryByIdAction(sub));
      }
      const sortRaw = sp.get("sort");
      return jsonNoStore(
        await getCategoriesAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 20),
          sort: sortRaw === "desc" ? "desc" : "asc",
          status: sp.get("status"),
        })
      );
    }

    case "languages": {
      if (sub) {
        return jsonNoStore(await getLanguageByIdAction(sub));
      }
      if (sp.get("all") === "1") {
        return jsonNoStore(await getAllLanguagesAction());
      }
      return jsonNoStore(
        await getLanguagesAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          search: sp.get("search") ?? undefined,
        })
      );
    }

    case "trainers": {
      if (sub) {
        return jsonNoStore(await getTrainerByIdAction(sub));
      }
      return jsonNoStore(
        await getTrainersAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          search: sp.get("search") ?? undefined,
          sort: sp.get("sort") ?? undefined,
        })
      );
    }

    case "accounts": {
      if (sub) {
        return jsonNoStore(await getAccountByIdAction(sub));
      }
      return jsonNoStore(
        await getAccountsAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          search: sp.get("search") ?? undefined,
          sort: sp.get("sort") ?? undefined,
        })
      );
    }

    case "admin-users": {
      if (sub) {
        return jsonNoStore(await getAdminUserByIdAction(sub));
      }
      return jsonNoStore(
        await getAdminUsersAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          search: sp.get("search") ?? undefined,
          sort: sp.get("sort") ?? undefined,
        })
      );
    }

    case "roles": {
      if (sub && sub2 === "permissions") {
        return jsonNoStore(await getRolePermissionsAction(sub));
      }
      if (sub) {
        return jsonNoStore(await getRoleByIdAction(sub));
      }
      if (sp.get("picklist") === "1") {
        return jsonNoStore(await getRolesPicklistAction());
      }
      return jsonNoStore(
        await getRolesAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          search: sp.get("search") ?? undefined,
          sort: sp.get("sort") ?? undefined,
        })
      );
    }

    case "faqs": {
      if (sub) {
        return jsonNoStore(await getFaqByIdAction(sub));
      }
      return jsonNoStore(
        await getFaqsAction({
          page: parsePositiveInt(sp.get("page"), 1),
          size: parsePositiveInt(sp.get("size"), 10),
          language: sp.get("language") ?? "en",
        })
      );
    }

    case "cities": {
      if (sub) {
        return jsonNoStore(await getCityByIdAction(sub));
      }
      return jsonNoStore(await getCitiesAction());
    }

    case "assessments": {
      if (sub === "links") {
        return jsonNoStore(
          await getAssessmentLinksAction({
            page: parsePositiveInt(sp.get("page"), 1),
            size: parsePositiveInt(sp.get("size"), 10),
            search: sp.get("search") ?? undefined,
          })
        );
      }
      if (sub === "results") {
        return jsonNoStore(
          await getAssessmentResultsAction({
            page: parsePositiveInt(sp.get("page"), 1),
            size: parsePositiveInt(sp.get("size"), 10),
            search: sp.get("search") ?? undefined,
          })
        );
      }
      return jsonNoStore({ success: false, error: "Unknown assessments endpoint" }, 404);
    }

    default: {
      return jsonNoStore({ success: false, error: "Unknown portal endpoint" }, 404);
    }
  }
}
