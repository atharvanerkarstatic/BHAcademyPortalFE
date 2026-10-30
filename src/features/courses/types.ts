export type CourseLanguageItem = {
  languageId: string;
  language: string;
  languageCode: string | null;
  videoCount: number;
};

export type CourseItem = {
  id: number;
  categoryId: string | number;
  categoryName: string;
  courseName: string;
  courseDetails?: string;
  courseLevel?: "Basic" | "Intermediate" | "Advanced" | string | null;
  duration?: string;
  imageUrl?: string;
  mode?: string;
  noOfCertifications?: string;
  noOfVideos?: number;
  points?: number;
  status: "ACTIVE" | "INACTIVE" | string;
  languages?: CourseLanguageItem[];
  // Multilingual courseName
  courseNameAs?: string;
  courseNameBn?: string;
  courseNameGu?: string;
  courseNameHi?: string;
  courseNameKn?: string;
  courseNameMl?: string;
  courseNameMr?: string;
  courseNameOr?: string;
  courseNameTa?: string;
  courseNameTe?: string;
  // Multilingual courseDetails
  courseDetailsAs?: string;
  courseDetailsBn?: string;
  courseDetailsGu?: string;
  courseDetailsHi?: string;
  courseDetailsKn?: string;
  courseDetailsMl?: string;
  courseDetailsMr?: string;
  courseDetailsOr?: string;
  courseDetailsTa?: string;
  courseDetailsTe?: string;
  // Multilingual courseLevel
  courseLevelAs?: string | null;
  courseLevelBn?: string | null;
  courseLevelGu?: string | null;
  courseLevelHi?: string | null;
  courseLevelKn?: string | null;
  courseLevelMl?: string | null;
  courseLevelMr?: string | null;
  courseLevelOr?: string | null;
  courseLevelTa?: string | null;
  courseLevelTe?: string | null;
};

export type CoursePageResponse = {
  content: CourseItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  status: number;
  message: string;
  data: T;
  path?: string;
  timestamp?: string;
};

export type CreateCoursePayload = {
  categoryId: string | number;
  courseName: string;
  points?: number;
  noOfVideos?: number;
  noOfCertifications?: string;
  courseLevel?: string;
  duration?: string;
  courseDetails?: string;
  imageUrl?: string;
  mode?: string;
  courseNameAs?: string;
  courseNameBn?: string;
  courseNameGu?: string;
  courseNameHi?: string;
  courseNameKn?: string;
  courseNameMl?: string;
  courseNameMr?: string;
  courseNameOr?: string;
  courseNameTa?: string;
  courseNameTe?: string;
  courseDetailsAs?: string;
  courseDetailsBn?: string;
  courseDetailsGu?: string;
  courseDetailsHi?: string;
  courseDetailsKn?: string;
  courseDetailsMl?: string;
  courseDetailsMr?: string;
  courseDetailsOr?: string;
  courseDetailsTa?: string;
  courseDetailsTe?: string;
  courseLevelAs?: string;
  courseLevelBn?: string;
  courseLevelGu?: string;
  courseLevelHi?: string;
  courseLevelKn?: string;
  courseLevelMl?: string;
  courseLevelMr?: string;
  courseLevelOr?: string;
  courseLevelTa?: string;
  courseLevelTe?: string;
};

export type UpdateCoursePayload = CreateCoursePayload;

