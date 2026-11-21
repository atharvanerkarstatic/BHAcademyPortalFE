export type LanguageItem = {
  languageId: string;
  language: string;
  languageCode: string | null;
  nativeName: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export type LanguagePageResponse = {
  content: Array<LanguageItem>;
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

export type CreateLanguagePayload = {
  language: string;
  languageCode?: string | null;
  nativeName?: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export type UpdateLanguagePayload = {
  language: string;
  languageCode?: string | null;
  nativeName?: string | null;
  isDefault: boolean;
  isActive: boolean;
};
