"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportCourseWiseAssessmentAction } from "@/features/reports/action";

export default function CourseWiseAssessmentReportPage() {
  return (
    <ReportPageLayout
      title="Module Wise Assessment"
      fields={["modeOfTraining", "division", "region", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportCourseWiseAssessmentAction({
          modeOfTraining: filters.modeOfTraining,
          division: filters.division,
          region: filters.region,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }}
    />
  );
}

