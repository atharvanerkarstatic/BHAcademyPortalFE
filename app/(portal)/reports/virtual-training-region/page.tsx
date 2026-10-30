"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportVirtualTrainingRegionAction } from "@/features/reports/action";

export default function VirtualTrainingRegionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Region)"
      fields={["region", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportVirtualTrainingRegionAction({
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

