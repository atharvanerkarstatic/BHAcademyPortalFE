"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { List, Loader2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { updateCourseTranslationAction } from "@/features/courses/action";
import type { CourseItem } from "@/features/courses/types";
import { LanguageSelect } from "@/features/languages/components/language-select";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";

import {
  getTranslatedCourseDetails,
  getTranslatedCourseName,
  resolveSelectedLangCode,
} from "./course-languages-meta";

interface CourseTranslationFormProps {
  courseId: string;
  course: CourseItem;
}

interface TranslationDraft {
  langCode: string;
  courseName?: string;
  description?: string;
  duration?: string;
  courseLevel?: string;
}

export function CourseTranslationForm({
  courseId,
  course,
}: CourseTranslationFormProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const selectedLangName = useCourseWorkspaceStore(
    (state) => state.selectedLangName
  );
  const selectedLangCode = useCourseWorkspaceStore(
    (state) => state.selectedLangCode
  );
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
  const setActiveDetailsTab = useCourseWorkspaceStore(
    (state) => state.setActiveDetailsTab
  );

  const langCodeKey = selectedLangCode || "en";

  const {
    data: translationData,
    isFetching: isLoadingTrans,
    isError: isTranslationError,
  } = useQuery({
    queryKey: queryKeys.courses.translation(courseId, langCodeKey),
    queryFn: async ({ signal }) => {
      const data = await portalGet<CourseItem | null>(
        `courses/${encodeURIComponent(courseId)}/translation`,
        { lang: langCodeKey },
        signal
      );
      return data ?? null;
    },
    retry: false,
  });

  const [draft, setDraft] = useState<TranslationDraft>({
    langCode: langCodeKey,
  });
  const [isSavingTrans, setIsSavingTrans] = useState(false);

  const isEn = langCodeKey.toLowerCase() === "en";
  const serverDefaults =
    translationData && !isTranslationError
      ? {
          courseName: translationData.courseName || "",
          description: translationData.courseDetails || "",
          duration: translationData.duration || "",
          courseLevel: translationData.courseLevel || "BEGINNER",
        }
      : {
          courseName:
            getTranslatedCourseName(course, langCodeKey) ||
            (isEn ? course.courseName || "" : ""),
          description:
            getTranslatedCourseDetails(course, langCodeKey) ||
            (isEn ? course.courseDetails || "" : ""),
          duration: course.duration || "",
          courseLevel: course.courseLevel || "BEGINNER",
        };

  const activeDraft =
    draft.langCode === langCodeKey ? draft : { langCode: langCodeKey };
  const transCourseName = activeDraft.courseName ?? serverDefaults.courseName;
  const transDescription =
    activeDraft.description ?? serverDefaults.description;
  const transDuration = activeDraft.duration ?? serverDefaults.duration;
  const transCourseLevel =
    activeDraft.courseLevel ?? serverDefaults.courseLevel;

  const updateDraft = (patch: Omit<TranslationDraft, "langCode">) => {
    setDraft((prev) => ({
      ...(prev.langCode === langCodeKey ? prev : { langCode: langCodeKey }),
      ...patch,
    }));
  };

  const handleReturnToDetails = () => {
    setDraft({ langCode: langCodeKey });
    setActiveDetailsTab("languages");
    setViewMode("details");
  };

  const handleSaveTranslation = async (
    event: React.SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!transCourseName.trim()) {
      toastError("Course Name is required");
      return;
    }

    setIsSavingTrans(true);
    try {
      const payload = {
        language: langCodeKey,
        courseName: transCourseName.trim(),
        courseDetails: transDescription.trim(),
        courseLevel: transCourseLevel || "BEGINNER",
        duration: transDuration.trim(),
      };

      const res = await updateCourseTranslationAction(course.id, payload);

      if (res.success) {
        success(res.message || "Course translation updated successfully");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.detail(courseId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.translation(courseId, langCodeKey),
          }),
        ]);
        handleReturnToDetails();
      } else {
        toastError(res.error || "Failed to update course translation.");
      }
    } catch {
      toastError("An unexpected error occurred while saving the translation.");
    } finally {
      setIsSavingTrans(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50/70 px-2 pt-2 text-sm font-medium">
        <button
          type="button"
          onClick={handleReturnToDetails}
          className="flex items-center gap-2 rounded-t-lg border-t-2 border-transparent px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <List className="h-4 w-4" />
          Course Details
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-t-lg border-t-2 border-blue-600 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 shadow-xs"
        >
          <Pencil className="h-4 w-4" />
          Edit Translation
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LanguageSelect
            value={langCodeKey}
            showCodeOnly
            onChange={(newId, newName, newCode) => {
              const resolvedCode = resolveSelectedLangCode(
                newId,
                newName,
                newCode
              );
              setDraft({ langCode: resolvedCode });
              setSelectedLangId(newId);
              setSelectedLangName(newName);
              setSelectedLangCode(resolvedCode);
            }}
          />

          {isLoadingTrans && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Fetching {selectedLangName} translation…
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Translations for {selectedLangName}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Language Code:{" "}
            <span className="font-mono font-semibold text-slate-700 uppercase">
              {langCodeKey}
            </span>
          </p>
        </div>

        <form
          onSubmit={(event) => {
            void handleSaveTranslation(event);
          }}
          className="mx-auto max-w-2xl space-y-4"
        >
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
            <Label
              htmlFor="trans-courseName"
              className="text-xs font-bold text-slate-800 sm:text-right"
            >
              Course Name <span className="text-rose-500">*</span>
            </Label>
            <div className="sm:col-span-3">
              <Input
                id="trans-courseName"
                value={transCourseName}
                onChange={(event) => {
                  updateDraft({ courseName: event.target.value });
                }}
                placeholder="Course Name"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
            <Label
              htmlFor="trans-description"
              className="pt-2 text-xs font-bold text-slate-800 sm:text-right"
            >
              Description
            </Label>
            <div className="sm:col-span-3">
              <Textarea
                id="trans-description"
                rows={4}
                value={transDescription}
                onChange={(event) => {
                  updateDraft({ description: event.target.value });
                }}
                placeholder="Description"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
            <Label
              htmlFor="trans-level"
              className="text-xs font-bold text-slate-800 sm:text-right"
            >
              Course Level
            </Label>
            <div className="sm:col-span-3">
              <select
                id="trans-level"
                value={transCourseLevel}
                onChange={(event) => {
                  updateDraft({ courseLevel: event.target.value });
                }}
                className="border-input focus-visible:ring-ring h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
            <Label
              htmlFor="trans-duration"
              className="pt-2 text-xs font-bold text-slate-800 sm:text-right"
            >
              Course Duration
            </Label>
            <div className="space-y-1 sm:col-span-3">
              <Input
                id="trans-duration"
                value={transDuration}
                type="text"
                onChange={(event) => {
                  updateDraft({ duration: event.target.value });
                }}
                placeholder="e.g. 32.03 mins or 1:20:39 hours"
                maxLength={100}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Allow decimal values or time formats. E.g.{" "}
                <span className="font-medium text-slate-700">32.03 mins</span>{" "}
                or{" "}
                <span className="font-medium text-slate-700">
                  1:20:39 hours
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSavingTrans || isLoadingTrans}
              className="h-8 min-w-24 gap-1.5 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
            >
              {isSavingTrans && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {isSavingTrans ? "SAVING…" : "SAVE"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReturnToDetails}
              className="h-8 min-w-20 border-slate-300 text-xs font-medium uppercase"
            >
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
