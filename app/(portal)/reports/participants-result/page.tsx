"use client";

import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import { exportParticipantsResultAction } from "@/features/reports/action";

export default function ParticipantsResultReportPage() {
  return (
    <ReportPageLayout
      title="Participants Result"
      fields={["modeOfTraining", "division", "region", "trainer", "language", "course", "dateRange"]}
      onGenerate={async (filters) => {
        return exportParticipantsResultAction({
          modeOfTraining: filters.modeOfTraining,
          division: filters.division,
          region: filters.region,
          trainer: filters.trainer,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }}
    />
  );
}

