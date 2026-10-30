export type CategoryItem = {
  categoryId: string | number;
  category: string;
  imageUrl?: string;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE" | string;
  featured: boolean;
  categoryAs?: string;
  categoryBn?: string;
  categoryGu?: string;
  categoryHi?: string;
  categoryKn?: string;
  categoryMl?: string;
  categoryMr?: string;
  categoryOr?: string;
  categoryTa?: string;
  categoryTe?: string;
  courseCount?: number;
};

export type CategoryPageResponse = {
  content: CategoryItem[];
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

export type CreateCategoryPayload = {
  category: string;
  imageUrl?: string;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  featured: boolean;
  categoryAs?: string;
  categoryBn?: string;
  categoryGu?: string;
  categoryHi?: string;
  categoryKn?: string;
  categoryMl?: string;
  categoryMr?: string;
  categoryOr?: string;
  categoryTa?: string;
  categoryTe?: string;
};

export type UpdateCategoryPayload = CreateCategoryPayload;
