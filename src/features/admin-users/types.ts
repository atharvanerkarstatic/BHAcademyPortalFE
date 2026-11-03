export interface RoleItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
  assignedUsersCount?: number;
  assignedPermissionsCount?: number;
  updatedAt?: string;
}

export interface RolePageResponse {
  content: RoleItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AdminUserItem {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  departmentId?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | string;
  isLocked?: boolean;
  isEmailVerified?: boolean;
  mobileNumber?: string | null;
  profilePic?: string | null;
  roleCodes?: string[];
  roles?: {
    id: number;
    code: string;
    name: string;
    systemRole?: boolean;
    active?: boolean;
  }[];
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  passwordChangedAt?: string;
  passwordExpiresAt?: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUserPageResponse {
  content: AdminUserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateAdminUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  departmentId?: string | null;
  roleIds: string[];
  mobileNumber?: string | null;
  profilePic?: string | null;
}

export interface UpdateAdminUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string | null;
  mobileNumber?: string | null;
  profilePic?: string | null;
  roleIds?: string[];
}

