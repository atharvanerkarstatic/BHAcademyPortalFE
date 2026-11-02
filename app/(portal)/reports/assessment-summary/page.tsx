"use client";

import { useState } from "react";
import { ReportPageLayout, type ReportFilterState } from "@/features/reports/components/report-page-layout";
import { getAssessmentSummaryDashboardAction } from "@/features/dashboard/action";
import type { AssessmentSummaryData } from "@/features/dashboard/types";
import {
  CollapsibleChartCard,
  DonutPieChart,
  GroupedBarChart,
  type ChartDataPoint,
} from "@/features/reports/components/dashboard-charts";
import { useToast } from "@/components/ui/toast";

export default function AssessmentSummaryReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [summaryData, setSummaryData] = useState<AssessmentSummaryData>({
    passed: 0,
    failed: 0,
    total: 0,
  });

  const fetchDashboardData = async (filters: ReportFilterState, showToast = false) => {
    const res = await getAssessmentSummaryDashboardAction({
      trainingMode: filters.modeOfTraining || "PHYSICAL",
      trainerId: filters.trainer || null,
      languageId: filters.languageId || null,
      courseId: filters.courseId || null,
      coursreId: filters.courseId || null,
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
    });

    if (res.success && res.data) {
      setSummaryData(res.data);
      if (showToast) {
        toastSuccess(res.message || "Assessment summary loaded");
      }
    } else {
      toastError(res.error || "Failed to load assessment summary");
    }
  };

  const total = summaryData.total ?? (summaryData.passed + summaryData.failed);

  // Data for the bottom Monthly / Total Assessments Results Summary bar chart
  const currentMonthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const barChartData: ChartDataPoint[] = [
    {
      label: currentMonthName,
      passed: summaryData.passed,
      failed: summaryData.failed,
      total,
    },
  ];

  return (
    <ReportPageLayout
      title="Assessment Results Summary"
      breadcrumbTitle="Assessment Summary"
      fields={["modeOfTraining", "trainer", "language", "course", "dateRange"]}
      layoutMode="split"
      showEmailSection={false}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchDashboardData(filters, true);
      }}
      onGenerate={async () => {
        const headers = "Metric,Count\n";
        const rows = `Passed,${summaryData.passed}\nFailed,${summaryData.failed}\nTotal,${total}\n`;
        return {
          success: true,
          data: headers + rows,
          filename: `assessment-summary_${new Date().toISOString().slice(0, 10)}.csv`,
          message: "Assessment summary exported",
        };
      }}
      splitRightSlot={
        /* Right Card: Assessments Results: Total X (Pie Chart) */
        <CollapsibleChartCard
          title="Assessments Results:"
          badgeText={`Total ${total}`}
        >
          <DonutPieChart
            passed={summaryData.passed}
            failed={summaryData.failed}
            passedLabel="Passed"
            failedLabel="Failed"
            passedColor="#10b981"
            failedColor="#ef4444"
          />
        </CollapsibleChartCard>
      }
    >
      {/* Bottom Card: Monthly Assessments Results Summary (Bar Chart) */}
      <CollapsibleChartCard title="Monthly Assessments Results Summary">
        <GroupedBarChart
          data={barChartData}
          passedLabel="Passed"
          failedLabel="Failed"
          passedColor="#3b82f6"
          failedColor="#ef4444"
          height={260}
        />
      </CollapsibleChartCard>
    </ReportPageLayout>
  );
}

