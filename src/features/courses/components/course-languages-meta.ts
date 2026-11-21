import type { CourseItem, CourseLanguageItem } from "@/features/courses/types";
import type { LanguageItem } from "@/features/languages/types";

export interface LanguageMeta {
  num: number;
  languageId: string;
  code: string;
  language: string;
  nativeLabel: string;
}

export interface CourseLangRow {
  num: number;
  languageId: string;
  code: string;
  language: string;
  nativeLabel: string;
  nameInLang?: string;
  hasTranslation: boolean;
  videosCount: number;
  questionsCount: number;
}

export const LANGUAGES_META: ReadonlyArray<LanguageMeta> = [
  {
    num: 1,
    languageId: "LANG_01",
    code: "en",
    language: "English",
    nativeLabel: "English",
  },
  {
    num: 2,
    languageId: "LANG_03",
    code: "Hi",
    language: "Hindi",
    nativeLabel: "हिन्दी (Hindi)",
  },
  {
    num: 3,
    languageId: "LANG_10",
    code: "Gu",
    language: "Gujarati",
    nativeLabel: "ગુજરાતી (Gujarati)",
  },
  {
    num: 4,
    languageId: "LANG_11",
    code: "Mr",
    language: "Marathi",
    nativeLabel: "मराठी (Marathi)",
  },
  {
    num: 5,
    languageId: "LANG_05",
    code: "Ml",
    language: "Malayalam",
    nativeLabel: "മലയാളം (Malayalam)",
  },
  {
    num: 6,
    languageId: "LANG_04",
    code: "Kn",
    language: "Kannada",
    nativeLabel: "ಕನ್ನಡ (Kannada)",
  },
  {
    num: 7,
    languageId: "LANG_02",
    code: "Bn",
    language: "Bengali",
    nativeLabel: "বাংলা (Bangla)",
  },
  {
    num: 8,
    languageId: "LANG_06",
    code: "Or",
    language: "Odia",
    nativeLabel: "ଓଡ଼ିଆ (Odia)",
  },
  {
    num: 9,
    languageId: "LANG_07",
    code: "Ta",
    language: "Tamil",
    nativeLabel: "தமிழ் (Tamil)",
  },
  {
    num: 10,
    languageId: "LANG_08",
    code: "Te",
    language: "Telugu",
    nativeLabel: "తెలుగు (Telugu)",
  },
  {
    num: 11,
    languageId: "LANG_09",
    code: "As",
    language: "Assamese",
    nativeLabel: "অসমীয়া (Assamese)",
  },
];

export function getTranslatedCourseName(
  course: CourseItem,
  code: string
): string | undefined {
  switch (code.toLowerCase()) {
    case "en": {
      return course.courseName;
    }
    case "as": {
      return course.courseNameAs;
    }
    case "bn": {
      return course.courseNameBn;
    }
    case "gu": {
      return course.courseNameGu;
    }
    case "hi": {
      return course.courseNameHi;
    }
    case "kn": {
      return course.courseNameKn;
    }
    case "ml": {
      return course.courseNameMl;
    }
    case "mr": {
      return course.courseNameMr;
    }
    case "or": {
      return course.courseNameOr;
    }
    case "ta": {
      return course.courseNameTa;
    }
    case "te": {
      return course.courseNameTe;
    }
    default: {
      return undefined;
    }
  }
}

export function getTranslatedCourseDetails(
  course: CourseItem,
  code: string
): string | undefined {
  switch (code.toLowerCase()) {
    case "en": {
      return course.courseDetails;
    }
    case "as": {
      return course.courseDetailsAs;
    }
    case "bn": {
      return course.courseDetailsBn;
    }
    case "gu": {
      return course.courseDetailsGu;
    }
    case "hi": {
      return course.courseDetailsHi;
    }
    case "kn": {
      return course.courseDetailsKn;
    }
    case "ml": {
      return course.courseDetailsMl;
    }
    case "mr": {
      return course.courseDetailsMr;
    }
    case "or": {
      return course.courseDetailsOr;
    }
    case "ta": {
      return course.courseDetailsTa;
    }
    case "te": {
      return course.courseDetailsTe;
    }
    default: {
      return undefined;
    }
  }
}

export function resolveSelectedLangCode(
  languageId: string,
  languageName: string,
  languageCode?: string | null
): string {
  const meta = LANGUAGES_META.find(
    (item) =>
      item.languageId === languageId ||
      item.language.toLowerCase() === languageName.toLowerCase()
  );
  return (languageCode || meta?.code || "en").toLowerCase();
}

function parseNumericId(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function resolveNumericLanguageId(params: {
  selectedLangId: string;
  selectedLangCode: string;
  selectedLangName: string;
  allBackendLanguages: ReadonlyArray<LanguageItem>;
  courseLanguages?: ReadonlyArray<CourseLanguageItem>;
}): number {
  const {
    selectedLangId,
    selectedLangCode,
    selectedLangName,
    allBackendLanguages,
    courseLanguages,
  } = params;

  const directId = parseNumericId(selectedLangId);
  if (directId !== null && directId > 0) {
    return directId;
  }

  const normalizedCode = selectedLangCode.toLowerCase();
  const normalizedName = selectedLangName.toLowerCase();

  const backendLang = allBackendLanguages.find(
    (item) =>
      (item.languageCode &&
        item.languageCode.toLowerCase() === normalizedCode) ||
      (item.language && item.language.toLowerCase() === normalizedName) ||
      item.languageId === selectedLangId
  );
  const backendId = parseNumericId(backendLang?.languageId);
  if (backendId !== null) {
    return backendId;
  }

  const courseLang = courseLanguages?.find(
    (item) =>
      (item.languageCode &&
        item.languageCode.toLowerCase() === normalizedCode) ||
      (item.language && item.language.toLowerCase() === normalizedName)
  );
  const courseLangId = parseNumericId(courseLang?.languageId);
  if (courseLangId !== null) {
    return courseLangId;
  }

  const matchedMeta = LANGUAGES_META.find(
    (item) =>
      item.languageId === selectedLangId ||
      item.code.toLowerCase() === normalizedCode ||
      item.language.toLowerCase() === normalizedName
  );
  if (matchedMeta) {
    return matchedMeta.num;
  }

  return 1;
}

export function buildCourseLanguageRows(
  course: CourseItem
): Array<CourseLangRow> {
  return LANGUAGES_META.map((meta) => {
    const isEn = meta.code === "en";
    const translatedName = getTranslatedCourseName(course, meta.code);
    const hasTranslation =
      Boolean(translatedName && translatedName.trim().length > 0) || isEn;

    const apiLang = course.languages?.find(
      (item) =>
        item.languageId === meta.languageId ||
        item.language.toLowerCase() === meta.language.toLowerCase() ||
        item.languageCode?.toLowerCase() === meta.code.toLowerCase()
    );

    return {
      num: meta.num,
      languageId: apiLang?.languageId || meta.languageId,
      code: meta.code,
      language: meta.language,
      nativeLabel: meta.nativeLabel,
      nameInLang: translatedName,
      hasTranslation,
      videosCount: apiLang?.videoCount ?? 0,
      questionsCount: apiLang?.questionCount ?? 0,
    };
  });
}
