export type DashboardData = {
  users?: number;
  linksShared?: number;
  assessmentTakenTrainer?: number;
  assessmentTakenSelf?: number;
  cities?: number;
  courses?: number;
  activeLanguages?: number;
  assessmentTakenTotal?: number;
  activeTrainers?: number;
  [key: string]: unknown;
};

export type DashboardApiResponse = {
  success: boolean;
  status: number;
  message: string;
  data: DashboardData;
  path?: string;
  timestamp?: string;
};

export type ModuleWiseSummaryItem = {
  moduleName: string;
  total: number;
  passed: number;
  failed: number;
};

export type TrainerWiseSummaryItem = {
  trainerName: string;
  total: number;
  passed: number;
  failed: number;
};

export type AssessmentSummaryData = {
  passed: number;
  failed: number;
  total?: number;
};

export type ModuleWiseFilterPayload = {
  division?: string | null;
  region?: string | null;
  trainerId?: string | number | null;
  trainer?: string | number | null;
  languageId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  modeOfTraining?: string | null;
};

export type TrainerWiseFilterPayload = {
  division?: string | null;
  region?: string | null;
  languageId?: string | number | null;
  courseId?: string | number | null;
  coursreId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type AssessmentSummaryFilterPayload = {
  trainingMode?: string | null;
  trainerId?: string | number | null;
  languageId?: string | number | null;
  courseId?: string | number | null;
  coursreId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
};
