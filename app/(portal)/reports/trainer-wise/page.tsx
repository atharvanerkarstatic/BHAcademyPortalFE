"use client";

import { useState } from "react";
import { ReportPageLayout, type ReportFilterState } from "@/features/reports/components/report-page-layout";
import { getTrainerWiseDashboardAction } from "@/features/dashboard/action";
import type { TrainerWiseSummaryItem } from "@/features/dashboard/types";
import {
  CollapsibleChartCard,
  GroupedBarChart,
  AssessmentSummaryTable,
  type ChartDataPoint,
} from "@/features/reports/components/dashboard-charts";
import { useToast } from "@/components/ui/toast";

export default function TrainerWiseSummaryReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [reportData, setReportData] = useState<TrainerWiseSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async (filters: ReportFilterState, showToast = false) => {
    setLoading(true);
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
    setLoading(false);
  };

  const chartData: ChartDataPoint[] = reportData.map((item) => ({
    label: item.trainerName || "Unknown",
    passed: Number(item.passed) || 0,
    failed: Number(item.failed) || 0,
    total: Number(item.total) || 0,
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
      onGenerate={async () => {
        // Generate CSV from current trainer-wise data
        const headers = "Trainer Name,Total,Passed,Failed\n";
        const rows = chartData
          .map((d) => `"${d.label}",${d.total},${d.passed},${d.failed}`)
          .join("\n");
        return {
          success: true,
          data: headers + rows,
          filename: `trainer-wise-summary_${new Date().toISOString().slice(0, 10)}.csv`,
          message: "Trainer-wise summary report generated",
        };
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

