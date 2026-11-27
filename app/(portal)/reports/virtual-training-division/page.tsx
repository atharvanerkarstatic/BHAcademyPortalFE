"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportVirtualTrainingDivisionAction } from "@/features/reports/action";

export default function VirtualTrainingDivisionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Division)"
      exportPermission={["virtual-training-division.export", "reports.export", "reports.read", "audit.read", "system.all"]}
      fields={["division", "region", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportVirtualTrainingDivisionAction({
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

