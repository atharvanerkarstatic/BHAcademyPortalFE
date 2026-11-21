"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getSampleImportAction } from "@/features/accounts/action";
import {
  importCourseQuizzesAction,
  importCourseTranslationsAction,
  importCourseVideosAction,
} from "@/features/courses/action";
import type { CourseImportResponse } from "@/features/courses/action";
import type { CourseItem } from "@/features/courses/types";
import { downloadCsv } from "@/lib/download";
import { queryKeys } from "@/lib/query-keys";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";

export type BulkImportTab = "translations" | "videos" | "questions";

type SampleImportType = "COURSE_TRANSLATIONS" | "COURSE_VIDEOS" | "QUIZ";

interface CourseBulkImportPanelProps {
  courseId: string;
  course: CourseItem;
  activeTab: BulkImportTab | null;
}

interface ImportTabConfig {
  sampleType: SampleImportType;
  bannerText: string;
  sampleColumns?: string;
  fileLabel: string;
  submitLabel: string;
  dialogTitle: string;
  dialogDesc: string;
  successPrefix: string;
  failureFallback: string;
  unexpectedError: string;
  runImport: (
    courseIdentifier: string | number,
    formData: FormData
  ) => Promise<{
    success: boolean;
    data?: CourseImportResponse;
    message?: string;
    error?: string;
  }>;
}

const IMPORT_TAB_CONFIG: Record<BulkImportTab, ImportTabConfig> = {
  translations: {
    sampleType: "COURSE_TRANSLATIONS",
    bannerText:
      "Upload a CSV / Excel file with course translations for the selected language.",
    sampleColumns: "courseName, description, courseLevel, languageCode",
    fileLabel: "Upload File (.csv, .xlsx)",
    submitLabel: "Upload Translations",
    dialogTitle: "Course Translations Import Issues",
    dialogDesc:
      "Some rows in your translation file could not be processed due to validation or mapping issues.",
    successPrefix: "Course translations imported successfully!",
    failureFallback:
      "Failed to import course translations. Please check file and parameters.",
    unexpectedError:
      "An unexpected error occurred during course translation upload.",
    runImport: importCourseTranslationsAction,
  },
  videos: {
    sampleType: "COURSE_VIDEOS",
    bannerText: "Upload a file with video links and metadata for this course.",
    sampleColumns:
      "courseId,languageId,title,youtubeId,description,displayOrder,status",
    fileLabel: "Upload File (.csv, .xlsx)",
    submitLabel: "Upload Videos",
    dialogTitle: "Course Videos Import Issues",
    dialogDesc:
      "Some rows in your video file could not be processed due to validation or duplicate video issues.",
    successPrefix: "Course videos imported successfully!",
    failureFallback:
      "Failed to import course videos. Please check file and parameters.",
    unexpectedError:
      "An unexpected error occurred during course videos upload.",
    runImport: importCourseVideosAction,
  },
  questions: {
    sampleType: "QUIZ",
    bannerText:
      "Upload a file with quiz questions and answer options for this course.",
    fileLabel: "Upload File (.csv, .xlsx, .xls)",
    submitLabel: "Upload Questions",
    dialogTitle: "Quiz Questions Import Issues",
    dialogDesc:
      "Some rows in your quiz file could not be processed due to validation or mapping issues.",
    successPrefix: "Quiz questions imported successfully!",
    failureFallback:
      "Failed to import quiz questions. Please check file and parameters.",
    unexpectedError:
      "An unexpected error occurred during quiz questions upload.",
    runImport: importCourseQuizzesAction,
  },
};

export function CourseBulkImportPanel({
  courseId,
  course,
  activeTab,
}: CourseBulkImportPanelProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const fileInputId = useId();

  const setActiveDetailsTab = useCourseWorkspaceStore(
    (state) => state.setActiveDetailsTab
  );
  const setViewMode = useCourseWorkspaceStore((state) => state.setViewMode);

  const [downloadingSample, setDownloadingSample] =
    useState<SampleImportType | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<
    Record<BulkImportTab, File | null>
  >({
    translations: null,
    videos: null,
    questions: null,
  });
  const [inputKeys, setInputKeys] = useState<Record<BulkImportTab, number>>({
    translations: 0,
    videos: 0,
    questions: 0,
  });
  const [importingTabs, setImportingTabs] = useState<
    Record<BulkImportTab, boolean>
  >({
    translations: false,
    videos: false,
    questions: false,
  });

  const [importResult, setImportResult] = useState<CourseImportResponse | null>(
    null
  );
  const [importDialogTitle, setImportDialogTitle] = useState(
    "Import Validation Issues"
  );
  const [importDialogDesc, setImportDialogDesc] = useState(
    "Some rows in your file could not be processed due to validation or mapping issues."
  );
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const config = activeTab ? IMPORT_TAB_CONFIG[activeTab] : null;
  const currentFile = activeTab ? selectedFiles[activeTab] : null;
  const isImporting = activeTab ? importingTabs[activeTab] : false;

  const clearTabFile = (tab: BulkImportTab) => {
    setSelectedFiles((prev) => ({ ...prev, [tab]: null }));
    setInputKeys((prev) => ({ ...prev, [tab]: prev[tab] + 1 }));
  };

  const handleDownloadSample = async (type: SampleImportType) => {
    setDownloadingSample(type);
    try {
      const res = await getSampleImportAction(type);
      if (res.success && res.data) {
        downloadCsv(
          res.data,
          res.filename || `${type.toLowerCase()}_sample.csv`
        );
        success("Sample template downloaded successfully!");
      } else {
        toastError(res.error || "Failed to download sample file");
      }
    } catch {
      toastError("Failed to download sample file");
    } finally {
      setDownloadingSample(null);
    }
  };

  const handleSubmitImport = async (
    event: React.SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!activeTab) {
      return;
    }

    const submitTab = activeTab;
    const submitConfig = IMPORT_TAB_CONFIG[submitTab];
    const submitFile = selectedFiles[submitTab];

    if (importingTabs[submitTab]) {
      return;
    }

    if (!submitFile) {
      toastError("Please choose an Excel / CSV file to upload.");
      return;
    }

    const effectiveCourseId =
      course.courseCode || String(course.id || courseId);
    if (!effectiveCourseId) {
      toastError("Course ID is required.");
      return;
    }

    setImportingTabs((prev) => ({ ...prev, [submitTab]: true }));
    try {
      const formData = new FormData();
      formData.append("file", submitFile);

      const res = await submitConfig.runImport(effectiveCourseId, formData);

      if (res.success) {
        const { data } = res;
        const hasErrors = Boolean(data?.errors && data.errors.length > 0);

        if (hasErrors && data) {
          setImportDialogTitle(submitConfig.dialogTitle);
          setImportDialogDesc(submitConfig.dialogDesc);
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `${submitConfig.successPrefix} (${data?.successCount ?? data?.totalRows ?? 0} rows processed)`
          );
          clearTabFile(submitTab);
          setActiveDetailsTab("languages");
          setViewMode("details");
          await queryClient.invalidateQueries({
            queryKey: queryKeys.courses.all,
          });
        }
      } else {
        if (res.data?.errors && res.data.errors.length > 0) {
          setImportDialogTitle(submitConfig.dialogTitle);
          setImportDialogDesc(submitConfig.dialogDesc);
          setImportResult(res.data);
          setErrorDialogOpen(true);
        }
        toastError(res.error || submitConfig.failureFallback);
      }
    } catch {
      toastError(submitConfig.unexpectedError);
    } finally {
      setImportingTabs((prev) => ({ ...prev, [submitTab]: false }));
    }
  };

  return (
    <>
      {activeTab && config ? (
        <div className="space-y-6 p-6">
          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-slate-700">{config.bannerText}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingSample === config.sampleType}
                onClick={() => {
                  void handleDownloadSample(config.sampleType);
                }}
                className="h-7 gap-1.5 border-blue-200 bg-white text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-3 w-3" />
                {downloadingSample === config.sampleType
                  ? "Downloading…"
                  : "Download Sample File"}
              </Button>
            </div>
            {config.sampleColumns ? (
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">
                  Columns in Sample File:
                </span>{" "}
                <code className="rounded border border-blue-200 bg-white px-1.5 py-0.5 font-mono text-blue-800">
                  {config.sampleColumns}
                </code>
              </p>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              void handleSubmitImport(event);
            }}
            className="max-w-2xl space-y-5"
          >
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-4">
              <span className="flex items-center gap-2 text-xs leading-none font-semibold text-slate-700 select-none sm:text-right">
                Course ID / Code
              </span>
              <div className="sm:col-span-3">
                <div className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-100 px-3 font-mono text-xs font-semibold text-slate-800">
                  <span>{course.courseCode || course.id}</span>
                  <span className="max-w-[200px] truncate font-sans text-[11px] font-normal text-slate-500">
                    ({course.courseName})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-4">
              <Label
                htmlFor={fileInputId}
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                {config.fileLabel} <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id={fileInputId}
                  key={`${activeTab}-${inputKeys[activeTab]}`}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(event) => {
                    setSelectedFiles((prev) => ({
                      ...prev,
                      [activeTab]: event.target.files?.[0] || null,
                    }));
                  }}
                  className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  required={!currentFile}
                />
                {currentFile && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-600">
                    Selected: {currentFile.name} (
                    {(currentFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pl-36">
              <Button
                type="submit"
                disabled={isImporting || !currentFile}
                className="h-8 min-w-24 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {isImporting && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {config.submitLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearTabFile(activeTab);
                  setActiveDetailsTab("languages");
                  setViewMode("details");
                }}
                className="h-8 border-slate-300 text-xs font-medium uppercase"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent
          size="xl"
          className="flex max-h-[85vh] flex-col p-6"
        >
          <AlertDialogHeader className="space-y-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-semibold text-slate-900">
                  {importDialogTitle}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500">
                  {importDialogDesc}
                </AlertDialogDescription>
              </div>
            </div>

            {importResult && (
              <div className="grid w-full grid-cols-3 gap-3 pt-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-slate-500 uppercase">
                    Total Rows
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                    {importResult.totalRows ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-emerald-700 uppercase">
                    Success
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {importResult.successCount ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-rose-700 uppercase">
                    Failures
                  </div>
                  <div className="text-lg font-bold text-rose-700">
                    {importResult.failureCount ??
                      importResult.errors?.length ??
                      0}
                  </div>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          <div className="my-3 flex-1 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="w-16 px-3 py-2">Row #</th>
                  <th className="w-28 px-3 py-2">Identifier</th>
                  <th className="w-28 px-3 py-2">Field</th>
                  <th className="w-32 px-3 py-2">Rejected Value</th>
                  <th className="px-3 py-2">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResult?.errors && importResult.errors.length > 0 ? (
                  importResult.errors.map((err, idx) => (
                    <tr
                      key={`${err.rowNumber ?? idx}-${err.field ?? "field"}-${idx}`}
                      className="transition-colors hover:bg-rose-50/30"
                    >
                      <td className="px-3 py-2 font-mono font-medium text-slate-700">
                        {err.rowNumber || "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 font-mono text-slate-600">
                        {err.identifier || "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {err.field || "—"}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 font-mono text-rose-700">
                        {err.rejectedValue !== undefined &&
                        err.rejectedValue !== null
                          ? `"${err.rejectedValue}"`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-rose-600">
                        {err.errorMessage}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No errors to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AlertDialogFooter className="border-t border-slate-100 pt-3">
            <AlertDialogCancel
              onClick={() => {
                setErrorDialogOpen(false);
                setImportResult(null);
              }}
              className="text-xs"
            >
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
