"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportVirtualTrainingRegionAction } from "@/features/reports/action";

export default function VirtualTrainingRegionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Region)"
      exportPermission={["virtual-training-region.export", "reports.export", "reports.read", "audit.read", "system.all"]}
      fields={["division", "region", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportVirtualTrainingRegionAction({
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

