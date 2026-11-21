export interface LanguageItem {
  languageId: string;
  language: string;
  languageCode: string | null;
  nativeName: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface LanguagePageResponse {
  content: Array<LanguageItem>;
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

export interface CreateLanguagePayload {
  language: string;
  languageCode?: string | null;
  nativeName?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateLanguagePayload {
  language: string;
  languageCode?: string | null;
  nativeName?: string | null;
  isDefault: boolean;
  isActive: boolean;
}
