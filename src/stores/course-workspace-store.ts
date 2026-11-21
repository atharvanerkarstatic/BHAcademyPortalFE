import { create } from "zustand";

export type CourseViewMode =
  | "details"
  | "translation_form"
  | "videos_view"
  | "questionnaire_view";

export type CourseDetailsTab =
  | "languages"
  | "translations"
  | "videos"
  | "questions";
export type QuestionnaireSubTab = "standard" | "interactive";

type ToggleUpdater =
  | Record<number, boolean>
  | ((prev: Record<number, boolean>) => Record<number, boolean>);

interface CourseWorkspaceState {
  viewMode: CourseViewMode;
  activeDetailsTab: CourseDetailsTab;
  questionnaireSubTab: QuestionnaireSubTab;
  selectedLangId: string;
  selectedLangName: string;
  selectedLangCode: string;
  portalToggles: Record<number, boolean>;
  trainingToggles: Record<number, boolean>;
  setViewMode: (mode: CourseViewMode) => void;
  setActiveDetailsTab: (tab: CourseDetailsTab) => void;
  setQuestionnaireSubTab: (tab: QuestionnaireSubTab) => void;
  setSelectedLangId: (id: string) => void;
  setSelectedLangName: (name: string) => void;
  setSelectedLangCode: (code: string) => void;
  setPortalToggles: (updater: ToggleUpdater) => void;
  setTrainingToggles: (updater: ToggleUpdater) => void;
  resetWorkspace: () => void;
}

const INITIAL_WORKSPACE = {
  viewMode: "details" as CourseViewMode,
  activeDetailsTab: "languages" as CourseDetailsTab,
  questionnaireSubTab: "standard" as QuestionnaireSubTab,
  selectedLangId: "LANG_01",
  selectedLangName: "English",
  selectedLangCode: "en",
  portalToggles: {} as Record<number, boolean>,
  trainingToggles: {} as Record<number, boolean>,
};

export const useCourseWorkspaceStore = create<CourseWorkspaceState>((set) => ({
  ...INITIAL_WORKSPACE,
  setViewMode: (viewMode) => {
    set({ viewMode });
  },
  setActiveDetailsTab: (activeDetailsTab) => {
    set({ activeDetailsTab });
  },
  setQuestionnaireSubTab: (questionnaireSubTab) => {
    set({ questionnaireSubTab });
  },
  setSelectedLangId: (selectedLangId) => {
    set({ selectedLangId });
  },
  setSelectedLangName: (selectedLangName) => {
    set({ selectedLangName });
  },
  setSelectedLangCode: (selectedLangCode) => {
    set({ selectedLangCode });
  },
  setPortalToggles: (updater) => {
    set((state) => ({
      portalToggles:
        typeof updater === "function" ? updater(state.portalToggles) : updater,
    }));
  },
  setTrainingToggles: (updater) => {
    set((state) => ({
      trainingToggles:
        typeof updater === "function"
          ? updater(state.trainingToggles)
          : updater,
    }));
  },
  resetWorkspace: () => {
    set({ ...INITIAL_WORKSPACE });
  },
}));
