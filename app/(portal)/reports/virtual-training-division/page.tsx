"use client";

import { exportVirtualTrainingDivisionAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";

export default function VirtualTrainingDivisionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Division)"
      fields={["division", "language", "course", "dateRange"]}
      onGenerate={(filters) =>
        exportVirtualTrainingDivisionAction({
          division: filters.division,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        })
      }
    />
  );
}
