"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportVirtualTrainingDivisionAction } from "@/features/reports/action";

export default function VirtualTrainingDivisionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Division)"
      fields={["division", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportVirtualTrainingDivisionAction({
          division: filters.division,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }}
    />
  );
}

