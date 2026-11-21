"use client";

import { useMemo } from "react";

import type { CourseItem } from "@/features/courses/types";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";

import { buildCourseLanguageRows } from "./course-languages-meta";
import type { CourseLangRow } from "./course-languages-meta";

interface CourseLanguagesTableProps {
  course: CourseItem;
}

export function CourseLanguagesTable({ course }: CourseLanguagesTableProps) {
  const setSelectedLangId = useCourseWorkspaceStore(
    (state) => state.setSelectedLangId
  );
  const setSelectedLangName = useCourseWorkspaceStore(
    (state) => state.setSelectedLangName
  );
  const setSelectedLangCode = useCourseWorkspaceStore(
    (state) => state.setSelectedLangCode
  );
  const setViewMode = useCourseWorkspaceStore((state) => state.setViewMode);

  const languageRows = useMemo(() => buildCourseLanguageRows(course), [course]);

  const selectLanguage = (row: CourseLangRow) => {
    setSelectedLangId(row.languageId);
    setSelectedLangName(row.language);
    setSelectedLangCode(row.code.toLowerCase());
  };

  const handleOpenTranslation = (row: CourseLangRow) => {
    selectLanguage(row);
    setViewMode("translation_form");
  };

  const handleOpenVideos = (row: CourseLangRow) => {
    selectLanguage(row);
    setViewMode("videos_view");
  };

  const handleOpenQuestionnaire = (row: CourseLangRow) => {
    selectLanguage(row);
    setViewMode("questionnaire_view");
  };

  return (
    <div className="overflow-x-auto p-2 sm:p-4">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b font-bold text-slate-800">
            <th className="w-8 px-3 py-2.5">#</th>
            <th className="min-w-40 px-3 py-2.5">Language</th>
            <th className="px-3 py-2.5 text-center">Translation</th>
            <th className="px-3 py-2.5 text-center">Videos</th>
            <th className="px-3 py-2.5 text-center">Questionairre</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {languageRows.map((row) => (
            <tr
              key={row.num}
              className="transition-colors hover:bg-slate-50/80"
            >
              <td className="px-3 py-2.5 font-mono text-slate-500">
                {row.num}
              </td>
              <td className="px-3 py-2.5 font-medium text-slate-800">
                <div>
                  <span>{row.nativeLabel}</span>
                  {row.nameInLang && (
                    <p className="max-w-xs truncate text-[11px] font-normal text-slate-400">
                      {row.nameInLang}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-3 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenTranslation(row);
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Edit Translation
                </button>
              </td>

              <td className="px-3 py-2.5 text-center">
                {row.videosCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenVideos(row);
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    View Videos({row.videosCount})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenVideos(row);
                    }}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    (Add Now)
                  </button>
                )}
              </td>

              <td className="px-3 py-2.5 text-center">
                {row.questionsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenQuestionnaire(row);
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {row.questionsCount} Questions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenQuestionnaire(row);
                    }}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    (Add Now)
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
