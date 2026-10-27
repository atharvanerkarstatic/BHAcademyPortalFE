export type AssessmentResultItem = {
  courseName: string;
  language: string;
  score: string;
  percentage: string;
  status: "PASS" | "FAIL" | string;
  certificateUrl?: string;
  date: string;
  mode: string;
};

export type AccountItem = {
  id: string;
  bhBp?: string;
  name: string;
  mobile?: string;
  mobileNumber?: string;
  email?: string;
  emailId?: string;
  state?: string;
  city?: string;
  district?: string;
  status?: "Active" | "Inactive" | "ACTIVE" | "INACTIVE" | string;
  active?: boolean | string;
  otp?: string;
  signupDate?: string;
  signupIp?: string;
  image?: string;
  profileImage?: string;
  profilePicture?: string;
  assessmentResults?: AssessmentResultItem[];
};

export type CreateAccountPayload = {
  name: string;
  mobileNumber?: string;
  mobile?: string;
  state: string;
  district?: string;
  city: string;
  bhBp?: string;
  emailId?: string;
  image?: string;
  active?: boolean | string;
  [key: string]: unknown;
};

export type UpdateAccountPayload = {
  name?: string;
  mobile?: string;
  mobileNumber?: string;
  state?: string;
  district?: string;
  city?: string;
  emailId?: string;
  image?: string;
  bhBp?: string;
  active?: string | boolean;
  [key: string]: unknown;
};

export type AccountPageResponse = {
  content: AccountItem[];
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

export type BulkImportError = {
  rowNumber: number;
  identifier?: string;
  field?: string;
  rejectedValue?: string;
  errorMessage: string;
};

export type BulkImportResponse = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors?: BulkImportError[];
};
