const enc = (value: string | number): string =>
  encodeURIComponent(String(value));

export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    changePassword: "/auth/change-password",
    forgotPassword: "/auth/v1/forgot-password",
    verifyOtp: "/auth/v1/forgot-password/verify-otp",
    resetPassword: "/auth/v1/forgot-password/reset",
  },
  dashboard: {
    summary: "/v1/dashboard",
    moduleWise: "/v1/dashboard/module-wise",
    trainerWise: "/v1/dashboard/trainer-wise",
    assessmentSummary: "/v1/dashboard/assessment-summary",
  },
  courses: {
    list: "/v1/courses",
    byId: (id: string | number) => `/v1/courses/${enc(id)}`,
    byCategory: (categoryId: string | number) =>
      `/v1/category/courses/${enc(categoryId)}`,
    toggleStatus: (id: string | number) =>
      `/v1/courses/${enc(id)}/toggle-status`,
    translationByLang: (courseId: string | number, langCode: string) =>
      `/v1/courses/${enc(courseId)}/language/${enc(langCode)}`,
    translations: (courseId: string | number) =>
      `/v1/courses/${enc(courseId)}/translations`,
    export: "/v1/courses/export",
    importTranslations: (courseId: string | number) =>
      `/v1/courses/${enc(courseId)}/import/language`,
    importVideos: (courseId: string | number) =>
      `/v1/course/${enc(courseId)}/videos/import`,
    importQuizzes: (courseId: string | number) =>
      `/v1/courses/${enc(courseId)}/quiz/import`,
    videosPost: "/v1/course/videos",
    videosByLang: (courseId: string | number, langCode: string) =>
      `/v1/courses/${enc(courseId)}/languages/${enc(langCode)}/videos`,
    createVideoByLang: (courseId: string | number, langCode: string) =>
      `/v1/courses/${enc(courseId)}/language/${enc(langCode)}/videos`,
    updateVideoByLang: (
      courseId: string | number,
      langCode: string,
      videoId: string | number
    ) =>
      `/v1/courses/${enc(courseId)}/languages/${enc(langCode)}/video/${enc(videoId)}`,
    deleteVideo: (videoId: string | number) => `/v1/video/${enc(videoId)}`,
    quizzesByLang: (courseId: string | number, langCode: string) =>
      `/v1/courses/${enc(courseId)}/languages/${enc(langCode)}/quizzes`,
    quizCreate: "/v1/quiz",
    quizUpdate: (quizId: string | number) => `/v1/quiz/${enc(quizId)}`,
    quizDelete: (quizId: string | number) => `/v1/quizzes/${enc(quizId)}`,
  },
  categories: {
    list: "/v1/category",
    byId: (id: string | number) => `/v1/category/${enc(id)}`,
  },
  accounts: {
    list: "/v1/accounts",
    create: "/v1/account",
    byIdSingular: (idOrBhBp: string) => `/v1/account/${enc(idOrBhBp)}`,
    byIdPlural: (idOrBhBp: string) => `/v1/accounts/${enc(idOrBhBp)}`,
    export: "/v1/accounts/export",
    import: "/v1/accounts/import",
    importBhbp: "/v1/accounts/import-bhbp",
    upload: "/v1/upload",
    sampleImport: (type: string) => `/v1/import/sample/${enc(type)}`,
  },
  users: {
    list: "/v1/users",
    byId: (id: string | number) => `/v1/users/${enc(id)}`,
    status: (id: string | number) => `/v1/users/${enc(id)}/status`,
    resetPassword: (id: string | number) =>
      `/v1/users/${enc(id)}/reset-password`,
    exportTrainers: "/v1/export/TRAINER",
  },
  roles: {
    list: "/v1/roles",
    byId: (id: string | number) => `/v1/roles/${enc(id)}`,
    permissions: (roleId: string | number) =>
      `/v1/permissions/roles/${enc(roleId)}`,
  },
  cities: {
    list: "/v1/city",
    byId: (id: string | number) => `/v1/city/${enc(id)}`,
    divisions: "/v1/city/division",
  },
  languages: {
    list: "/v1/languages",
    byId: (id: string | number) => `/v1/languages/${enc(id)}`,
  },
  faqs: {
    list: "/v1/faqs",
    byId: (id: string | number) => `/v1/faqs/${enc(id)}`,
  },
  assessments: {
    sendLink: "/v1/assessments/send-assessment-link",
    links: "/v1/assessments/links",
    results: "/v1/assessments/assessment-result",
  },
  reports: {
    participantsExport: "/v1/report/participants/export",
    onDemandVideoExport: "/v1/report/on-demand-video/export",
    virtualTrainingDivisionExport:
      "/v1/report/virtual-training-division/export",
    virtualTrainingRegionExport: "/v1/report/virtual-training-region/export",
    moduleWiseSummaryExport: "/v1/report/module-wise-summary/export",
    trainerAccessLogsExport: "/v1/report/trainers-access-log-report/export",
    trainerIpReportExport: "/v1/report/trainers-assessment-ip-report/export",
  },
} as const;
