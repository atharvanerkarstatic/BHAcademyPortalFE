import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReportFilterFieldKey =
  | "languageId"
  | "courseId"
  | "modeOfTraining"
  | "division"
  | "region"
  | "trainer"
  | "startDate"
  | "endDate"
  | "emails";

interface ReportFiltersDraftState {
  languageId: string;
  courseId: string;
  modeOfTraining: string;
  division: string;
  region: string;
  trainer: string;
  startDate: string;
  endDate: string;
  emails: string;
  filterCollapsed: boolean;
  setField: (key: ReportFilterFieldKey, value: string) => void;
  toggleFilterCollapsed: () => void;
  resetFilters: (defaultEmail?: string) => void;
}

export const useReportFiltersStore = create<ReportFiltersDraftState>()(
  persist(
    (set) => ({
      languageId: "",
      courseId: "",
      modeOfTraining: "PHYSICAL",
      division: "",
      region: "",
      trainer: "",
      startDate: "",
      endDate: "",
      emails: "",
      filterCollapsed: false,
      setField: (key, value) => {
        set({ [key]: value });
      },
      toggleFilterCollapsed: () => {
        set((state) => ({ filterCollapsed: !state.filterCollapsed }));
      },
      resetFilters: (defaultEmail = "") => {
        set({
          languageId: "",
          courseId: "",
          modeOfTraining: "PHYSICAL",
          division: "",
          region: "",
          trainer: "",
          startDate: "",
          endDate: "",
          emails: defaultEmail,
        });
      },
    }),
    {
      name: "bh-portal-report-filters",
      partialize: (state) => ({
        modeOfTraining: state.modeOfTraining,
        division: state.division,
        region: state.region,
        startDate: state.startDate,
        endDate: state.endDate,
        emails: state.emails,
      }),
    }
  )
);
