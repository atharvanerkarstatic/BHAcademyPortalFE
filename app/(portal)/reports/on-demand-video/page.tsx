"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportOnDemandVideoAction } from "@/features/reports/action";

export default function OnDemandVideosPendingAssessmentsPage() {
  return (
    <ReportPageLayout
      title="On-Demand Videos Pending Assessments"
      fields={["language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportOnDemandVideoAction({
          courseId: filters.courseId,
          languageId: filters.languageId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }}
    />
  );
}

