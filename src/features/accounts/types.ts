export interface AssessmentResultItem {
  courseName: string;
  language: string;
  score: string;
  percentage: string;
  status: string;
  certificateUrl?: string;
  date: string;
  mode: string;
}

export interface AccountItem {
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
  status?: string;
  active?: boolean | string;
  otp?: string;
  signupDate?: string;
  signupIp?: string;
  image?: string | null;
  profilePic?: string | null;
  profileImage?: string | null;
  profilePicture?: string | null;
  assessmentResults?: Array<AssessmentResultItem>;
}

export interface CreateAccountPayload {
  name: string;
  mobileNumber: string;
  emailId?: string;
  image?: string;
  pincode?: string;
}

export interface UpdateAccountPayload {
  name: string;
  mobileNumber?: string | null;
  bhBp: string;
  emailId?: string | null;
  image?: string | null;
  active?: boolean;
  pincode?: string | null;
}

export interface AccountPageResponse {
  content: Array<AccountItem>;
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

export interface BulkImportError {
  rowNumber: number;
  identifier?: string;
  field?: string;
  rejectedValue?: string;
  errorMessage: string;
}

export interface BulkImportResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors?: Array<BulkImportError>;
}
