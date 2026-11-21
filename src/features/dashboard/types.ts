export interface DashboardData {
  users?: number;
  linksShared?: number;
  assessmentTakenTrainer?: number;
  assessmentTakenSelf?: number;
  cities?: number;
  courses?: number;
  activeLanguages?: number;
  assessmentTakenTotal?: number;
  activeTrainers?: number;
  trainers?: number;
}

export interface DashboardApiResponse {
  success: boolean;
  status: number;
  message: string;
  data: DashboardData;
  path?: string;
  timestamp?: string;
}

export interface ModuleWiseSummaryItem {
  moduleName: string;
  total: number;
  passed: number;
  failed: number;
}

export interface TrainerWiseSummaryItem {
  trainerName: string;
  total: number;
  passed: number;
  failed: number;
}

export interface AssessmentSummaryData {
  passed: number;
  failed: number;
  total?: number;
}

export interface ModuleWiseFilterPayload {
  division?: string | null;
  region?: string | null;
  trainerId?: string | number | null;
  trainer?: string | number | null;
  languageId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  modeOfTraining?: string | null;
}

export interface TrainerWiseFilterPayload {
  division?: string | null;
  region?: string | null;
  languageId?: string | number | null;
  courseId?: string | number | null;
  coursreId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AssessmentSummaryFilterPayload {
  trainingMode?: string | null;
  trainerId?: string | number | null;
  languageId?: string | number | null;
  courseId?: string | number | null;
  coursreId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
}
