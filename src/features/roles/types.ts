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

export interface PermissionItem {
  permissionId: number;
  permissionKey: string;
  displayName: string;
  description: string;
  module: string;
  action: string;
  category: string;
  supportedScopes: string;
  assigned: boolean;
}

export interface RolePermissionsData {
  roleId: number;
  roleCode: string;
  roleName: string;
  assignedCount: number;
  permissions: Record<string, PermissionItem[]>;
}

export interface RolePermissionsResponse {
  success: boolean;
  status: number;
  message: string;
  data: RolePermissionsData;
  path?: string;
  timestamp?: string;
}

