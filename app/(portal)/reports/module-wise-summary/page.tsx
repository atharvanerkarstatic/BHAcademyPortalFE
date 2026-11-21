"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { getModuleWiseDashboardAction } from "@/features/dashboard/action";
import type { ModuleWiseSummaryItem } from "@/features/dashboard/types";
import { exportCourseWiseAssessmentAction } from "@/features/reports/action";
import {
  CollapsibleChartCard,
  GroupedBarChart,
  AssessmentSummaryTable,
} from "@/features/reports/components/dashboard-charts";
import type { ChartDataPoint } from "@/features/reports/components/dashboard-charts";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import type { ReportFilterState } from "@/features/reports/components/report-page-layout";

export default function ModuleWiseSummaryReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [reportData, setReportData] = useState<Array<ModuleWiseSummaryItem>>(
    []
  );

  const fetchDashboardData = async (
    filters: ReportFilterState,
    showToast = false
  ) => {
    const res = await getModuleWiseDashboardAction({
      division: filters.division || null,
      region: filters.region || null,
      trainerId: filters.trainer || null,
      trainer: filters.trainer || null,
      languageId: filters.languageId || null,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      modeOfTraining: filters.modeOfTraining || "VIRTUAL",
    });

    if (res.success && res.data) {
      setReportData(res.data);
      if (showToast) {
        toastSuccess(res.message || "Module-wise summary loaded");
      }
    } else {
      toastError(res.error || "Failed to load module-wise summary");
    }
  };

  const chartData: Array<ChartDataPoint> = reportData.map((item) => ({
    label: item.moduleName,
    passed: item.passed || 0,
    failed: item.failed || 0,
    total: item.total || 0,
  }));

  // Top courses/modules (or all)
  const top10Data = chartData.slice(0, 10);

  return (
    <ReportPageLayout
      title="Module Wise Assessment"
      breadcrumbTitle="Module Wise Summary"
      fields={[
        "modeOfTraining",
        "trainer",
        "division",
        "region",
        "language",
        "course",
        "dateRange",
      ]}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchDashboardData(filters, true);
      }}
      onGenerate={(filters) =>
        exportCourseWiseAssessmentAction({
          modeOfTraining: filters.modeOfTraining,
          division: filters.division,
          region: filters.region,
          trainer: filters.trainer,
          trainerId: filters.trainer,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        })
      }
    >
      {/* Dashboard Rendered Below Filter Card */}
      <div className="space-y-6">
        {/* Top Courses/Modules Chart Card */}
        <CollapsibleChartCard title="Top 10 Courses/Modules - Assessment Wise">
          <GroupedBarChart
            data={top10Data.length > 0 ? top10Data : chartData}
            passedLabel="Passed"
            failedLabel="Failed"
            passedColor="#3b82f6"
            failedColor="#ef4444"
          />
        </CollapsibleChartCard>

        {/* Modules-Wise Assessment Results Table */}
        <AssessmentSummaryTable
          title="Modules-Wise Assessment Results"
          itemLabel="Module"
          data={chartData}
        />
      </div>
    </ReportPageLayout>
  );
}
