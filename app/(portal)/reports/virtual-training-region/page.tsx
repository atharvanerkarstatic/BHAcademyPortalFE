"use client";

import { exportVirtualTrainingRegionAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";

export default function VirtualTrainingRegionReportPage() {
  return (
    <ReportPageLayout
      title="Virtual Training (Region)"
      fields={["region", "language", "course", "dateRange"]}
      onGenerate={(filters) =>
        exportVirtualTrainingRegionAction({
          region: filters.region,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        })
      }
    />
  );
}
