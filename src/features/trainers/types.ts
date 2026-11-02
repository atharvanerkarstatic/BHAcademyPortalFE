export interface TrainerItem {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  departmentId?: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  isLocked?: boolean;
  isEmailVerified?: boolean;
  mobileNumber?: string;
  profilePic?: string;
  roleCodes?: string[];
  roles?: {
    id: number;
    code: string;
    name: string;
    systemRole?: boolean;
    active?: boolean;
  }[];
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TrainerPageResponse {
  content: TrainerItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateTrainerPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  departmentId?: string | null;
  mobileNumber?: string;
  profilePic?: string;
  roleIds?: string[];
}

export interface UpdateTrainerPayload {
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string | null;
  profilePic?: string | null;
  mobileNumber?: string;
}

