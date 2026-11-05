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
  email?: string | null;
  emailId?: string | null;
  state?: string;
  city?: string;
  district?: string;
  region?: string | null;
  pincode?: string | null;
  pinCode?: string | null;
  status?: "Active" | "Inactive" | "ACTIVE" | "INACTIVE" | string;
  active?: boolean | string;
  otp?: string;
  signupDate?: string;
  signupIp?: string;
  image?: string | null;
  profilePic?: string | null;
  profileImage?: string | null;
  profilePicture?: string | null;
  assessmentResults?: AssessmentResultItem[];
};

export type CreateAccountPayload = {
  name: string;
  mobileNumber: string;
  bhBp?: string;
  emailId?: string;
  image?: string;
  pincode?: string;
  [key: string]: unknown;
};

export type UpdateAccountPayload = {
  name: string;
  mobileNumber?: string | null;
  bhBp: string;
  emailId?: string | null;
  image?: string | null;
  active?: boolean;
  pincode?: string | null;
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
