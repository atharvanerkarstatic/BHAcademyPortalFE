"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, List, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { deleteCourseAction } from "@/features/courses/action";
import { CourseBulkImportPanel } from "@/features/courses/components/course-bulk-import-panel";
import { CourseDetailsSidebar } from "@/features/courses/components/course-details-sidebar";
import { CourseLanguagesTable } from "@/features/courses/components/course-languages-table";
import { CourseQuizManager } from "@/features/courses/components/course-quiz-manager";
import { CourseTranslationForm } from "@/features/courses/components/course-translation-form";
import { CourseVideosManager } from "@/features/courses/components/course-videos-manager";
import type { CourseItem } from "@/features/courses/types";
import type { LanguageItem } from "@/features/languages/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";
import type { CourseDetailsTab } from "@/stores/course-workspace-store";

const DETAILS_TABS: ReadonlyArray<{ id: CourseDetailsTab; label: string }> = [
  { id: "languages", label: "Course Languages" },
  { id: "translations", label: "Upload Translations" },
  { id: "videos", label: "Upload Videos" },
  { id: "questions", label: "Upload Questions" },
];

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = String(params.id ?? "");

  const { success, error: toastError } = useToast();

  const viewMode = useCourseWorkspaceStore((state) => state.viewMode);
  const setViewMode = useCourseWorkspaceStore((state) => state.setViewMode);
  const activeDetailsTab = useCourseWorkspaceStore(
    (state) => state.activeDetailsTab
  );
  const setActiveDetailsTab = useCourseWorkspaceStore(
    (state) => state.setActiveDetailsTab
  );
  const resetWorkspace = useCourseWorkspaceStore(
    (state) => state.resetWorkspace
  );

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allBackendLanguages = [] } = useQuery({
    queryKey: queryKeys.allLanguages,
    queryFn: ({ signal }) =>
      portalGet<Array<LanguageItem>>("languages", { all: "1" }, signal),
    staleTime: 10 * 60_000,
  });

  const { data: course = null, isLoading: fetching } = useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: ({ signal }) =>
      portalGet<CourseItem>(
        `courses/${encodeURIComponent(id)}`,
        undefined,
        signal
      ),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (id) {
      resetWorkspace();
    }
    return () => {
      resetWorkspace();
    };
  }, [id, resetWorkspace]);

  const handleConfirmDelete = async () => {
    if (!course) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteCourseAction(course.id);
      setDeleteModalOpen(false);
      if (res.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
        ]);
        success(res.message || "Course deleted successfully");
        router.push("/courses");
      } else {
        toastError(res.error || "Failed to delete course");
      }
    } catch {
      setDeleteModalOpen(false);
      toastError("Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading course details…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600"
        >
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
        <Card className="p-8 text-center text-slate-500">
          Course not found or you do not have permission to view this course.
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setViewMode("details");
              setActiveDetailsTab("languages");
              router.push("/courses");
            }}
            className="text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Course Name: {course.courseName}
          </h1>
        </div>

        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href="/courses"
                onClick={() => {
                  setViewMode("details");
                  setActiveDetailsTab("languages");
                }}
                className="text-blue-600 hover:underline"
              >
                Courses
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-slate-700">Details</li>
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <CourseDetailsSidebar
          course={course}
          onDeleteClick={() => {
            setDeleteModalOpen(true);
          }}
        />

        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
          <Card
            className={cn(
              "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
              viewMode !== "details" && "hidden"
            )}
          >
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50/70 px-2 pt-2 text-sm font-medium">
              {DETAILS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveDetailsTab(tab.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-t-lg border-t-2 px-4 py-2.5 text-xs font-medium transition-colors",
                    activeDetailsTab === tab.id
                      ? "border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                      : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <List className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeDetailsTab === "languages" && (
              <CourseLanguagesTable course={course} />
            )}

            <CourseBulkImportPanel
              courseId={id}
              course={course}
              activeTab={
                activeDetailsTab === "languages" ? null : activeDetailsTab
              }
            />
          </Card>

          {viewMode === "translation_form" && (
            <CourseTranslationForm courseId={id} course={course} />
          )}

          {viewMode === "videos_view" && (
            <CourseVideosManager courseId={id} course={course} />
          )}

          {viewMode === "questionnaire_view" && (
            <CourseQuizManager
              courseId={id}
              course={course}
              allBackendLanguages={allBackendLanguages}
            />
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Course?"
        description={
          <>
            Are you sure you want to delete this course (ID: {course.id})?
            <br />
            <strong className="mt-2 line-clamp-2 text-slate-800">
              {course.courseName}
            </strong>
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
