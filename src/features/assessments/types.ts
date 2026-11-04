export interface SendAssessmentLinkPayload {
  trainerId: number | string;
  languageId: number | string;
  courseId: number | string;
  trainingDate: string;
  mobileNumbers: string[];
}

export interface AssessmentRecordItem {
  assessmentRecordId: number;
  mobileNumber: string;
  participantName?: string;
  courseName?: string;
  trainingDate?: string;
  status: string;
}

export interface SendAssessmentLinkResponse {
  success: boolean;
  status: number;
  message: string;
  data: AssessmentRecordItem[];
  timestamp?: string;
  error?: string;
}

export interface AssessmentLinkItem {
  id: number;
  course: string;
  language: string;
  trainer: string;
  trainingDate: string;
  mobile: string;
  linkId: string;
  linkStatus: string;
}

export interface AssessmentLinkPageResponse {
  content: AssessmentLinkItem[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements?: number;
  empty?: boolean;
}

export interface AssessmentResultItem {
  id: number;
  user: string;
  course: string;
  language: string;
  modeOfTraining: string;
  trainer: string;
  result: string;
  date: string;
}

export interface AssessmentResultPageResponse {
  content: AssessmentResultItem[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements?: number;
  empty?: boolean;
}


