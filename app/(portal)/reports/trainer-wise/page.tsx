"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { getTrainerWiseDashboardAction } from "@/features/dashboard/action";
import type { TrainerWiseSummaryItem } from "@/features/dashboard/types";
import {
  CollapsibleChartCard,
  GroupedBarChart,
  AssessmentSummaryTable,
} from "@/features/reports/components/dashboard-charts";
import type { ChartDataPoint } from "@/features/reports/components/dashboard-charts";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import type { ReportFilterState } from "@/features/reports/components/report-page-layout";

export default function TrainerWiseSummaryReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [reportData, setReportData] = useState<Array<TrainerWiseSummaryItem>>(
    []
  );

  const fetchDashboardData = async (
    filters: ReportFilterState,
    showToast = false
  ) => {
    const res = await getTrainerWiseDashboardAction({
      division: filters.division || null,
      region: filters.region || null,
      languageId: filters.languageId || null,
      coursreId: filters.courseId || null,
      courseId: filters.courseId || null,
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
    });

    if (res.success && res.data) {
      setReportData(res.data);
      if (showToast) {
        toastSuccess(res.message || "Trainer-wise summary loaded");
      }
    } else {
      toastError(res.error || "Failed to load trainer-wise summary");
    }
  };

  const chartData: Array<ChartDataPoint> = reportData.map((item) => ({
    label: item.trainerName || "Unknown",
    passed: item.passed || 0,
    failed: item.failed || 0,
    total: item.total || 0,
  }));

  return (
    <ReportPageLayout
      title="Trainer-wise Summary"
      breadcrumbTitle="Trainer-wise Summary"
      fields={["division", "region", "language", "course", "dateRange"]}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchDashboardData(filters, true);
      }}
      onGenerate={() => {
        // Generate CSV from current trainer-wise data
        const headers = "Trainer Name,Total,Passed,Failed\n";
        const rows = chartData
          .map((d) => `"${d.label}",${d.total},${d.passed},${d.failed}`)
          .join("\n");
        return Promise.resolve({
          success: true,
          data: headers + rows,
          filename: `trainer-wise-summary_${new Date().toISOString().slice(0, 10)}.csv`,
          message: "Trainer-wise summary report generated",
        });
      }}
    >
      <div className="space-y-6">
        {/* Trainer-wise Bar Chart */}
        <CollapsibleChartCard title="Trainer-wise Assessment Summary">
          <GroupedBarChart
            data={chartData}
            passedLabel="Passed"
            failedLabel="Failed"
            passedColor="#3b82f6"
            failedColor="#ef4444"
          />
        </CollapsibleChartCard>

        {/* Trainer-Wise Assessment Results Table */}
        <AssessmentSummaryTable
          title="Trainer-Wise Assessment Results"
          itemLabel="Trainer Name"
          data={chartData}
        />
      </div>
    </ReportPageLayout>
  );
}
