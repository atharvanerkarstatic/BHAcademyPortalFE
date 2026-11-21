export interface FaqItem {
  id: number;
  language: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: string;
  translatedLanguages?: number;
  createdAt?: string;
  updatedAt?: string;
  questionBn?: string;
  questionHi?: string;
  questionKn?: string;
  questionMl?: string;
  questionOr?: string;
  questionTa?: string;
  questionTe?: string;
  questionAs?: string;
  questionGu?: string;
  questionMr?: string;
  answerBn?: string;
  answerHi?: string;
  answerKn?: string;
  answerMl?: string;
  answerOr?: string;
  answerTa?: string;
  answerTe?: string;
  answerAs?: string;
  answerGu?: string;
  answerMr?: string;
}

export interface FaqPageResponse {
  content: Array<FaqItem>;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  path?: string;
  timestamp?: string;
}

export interface CreateFaqPayload {
  question: string;
  answer: string;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  questionBn?: string;
  questionHi?: string;
  questionKn?: string;
  questionMl?: string;
  questionOr?: string;
  questionTa?: string;
  questionTe?: string;
  questionAs?: string;
  questionGu?: string;
  questionMr?: string;
  answerBn?: string;
  answerHi?: string;
  answerKn?: string;
  answerMl?: string;
  answerOr?: string;
  answerTa?: string;
  answerTe?: string;
  answerAs?: string;
  answerGu?: string;
  answerMr?: string;
}

export type UpdateFaqPayload = CreateFaqPayload;
