"use client";

import { exportOnDemandVideoAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";

export default function OnDemandVideosPendingAssessmentsPage() {
  return (
    <ReportPageLayout
      title="On-Demand Videos Pending Assessments"
      defaultEmail="satyam.pattnaik@stetig.in"
      fields={["language", "course", "dateRange"]}
      onGenerate={(filters) =>
        exportOnDemandVideoAction({
          courseId: filters.courseId,
          languageId: filters.languageId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        })
      }
    />
  );
}
