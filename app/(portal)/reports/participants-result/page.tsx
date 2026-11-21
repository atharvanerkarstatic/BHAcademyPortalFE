"use client";

import { exportParticipantsResultAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";

export default function ParticipantsResultReportPage() {
  return (
    <ReportPageLayout
      title="Participants Result"
      fields={[
        "modeOfTraining",
        "division",
        "region",
        "trainer",
        "language",
        "course",
        "dateRange",
      ]}
      onGenerate={(filters) =>
        exportParticipantsResultAction({
          modeOfTraining: filters.modeOfTraining,
          division: filters.division,
          region: filters.region,
          trainer: filters.trainer,
          languageId: filters.languageId,
          courseId: filters.courseId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        })
      }
    />
  );
}
