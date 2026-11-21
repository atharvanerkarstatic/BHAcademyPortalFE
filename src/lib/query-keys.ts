export const queryKeys = {
  profile: ["profile"] as const,
  divisions: ["reference", "divisions"] as const,
  reportFilters: ["reference", "report-filters"] as const,
  allLanguages: ["reference", "languages", "all"] as const,
  rolesPicklist: ["reference", "roles", "picklist"] as const,

  dashboard: {
    all: ["dashboard"] as const,
    byDivision: (division: string) => ["dashboard", division] as const,
  },
  courses: {
    all: ["courses"] as const,
    list: (params: { page: number; size: number; search: string; sort?: string }) =>
      ["courses", "list", params] as const,
    byCategory: (categoryId: string) => ["courses", "category", categoryId] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
    videos: (courseId: string, lang: string) => ["courses", "videos", courseId, lang] as const,
    quizzes: (courseId: string, lang: string, quizType?: string) =>
      ["courses", "quizzes", courseId, lang, quizType ?? "ALL"] as const,
    translation: (courseId: string, lang: string) =>
      ["courses", "translation", courseId, lang] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: (params: { page: number; size: number; sort?: string; status?: string | null }) =>
      ["categories", "list", params] as const,
    detail: (id: string) => ["categories", "detail", id] as const,
  },
  languages: {
    all: ["languages"] as const,
    list: (params: { page: number; size: number; search?: string }) =>
      ["languages", "list", params] as const,
    detail: (id: string) => ["languages", "detail", id] as const,
  },
  trainers: {
    all: ["trainers"] as const,
    list: (params: { page: number; size: number; search: string; sort?: string }) =>
      ["trainers", "list", params] as const,
    detail: (id: string) => ["trainers", "detail", id] as const,
  },
  accounts: {
    all: ["accounts"] as const,
    list: (params: { page: number; size: number; search: string }) =>
      ["accounts", "list", params] as const,
    detail: (id: string) => ["accounts", "detail", id] as const,
  },
  adminUsers: {
    all: ["admin-users"] as const,
    list: (params: { page: number; size: number; search: string }) =>
      ["admin-users", "list", params] as const,
    detail: (id: string) => ["admin-users", "detail", id] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: (params: { page: number; size: number; search: string }) =>
      ["roles", "list", params] as const,
    detail: (id: string) => ["roles", "detail", id] as const,
    permissions: (id: string) => ["roles", "permissions", id] as const,
  },
  faqs: {
    all: ["faqs"] as const,
    list: (params: { page: number; size: number; language: string }) =>
      ["faqs", "list", params] as const,
    detail: (id: string) => ["faqs", "detail", id] as const,
  },
  cities: {
    all: ["cities"] as const,
    list: () => ["cities", "list"] as const,
    detail: (id: string) => ["cities", "detail", id] as const,
  },
  assessments: {
    links: (params: { page: number; size: number; search: string }) =>
      ["assessments", "links", params] as const,
    results: (params: { page: number; size: number; search: string }) =>
      ["assessments", "results", params] as const,
  },
} as const;
