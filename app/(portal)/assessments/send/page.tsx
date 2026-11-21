"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Link2,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { sendAssessmentLinkAction } from "@/features/assessments/action";
import type { AssessmentRecordItem } from "@/features/assessments/types";
import type { ReportFilterOptions } from "@/features/reports/action";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { isValidMobileNumber, sanitizeMobileNumber } from "@/lib/validations";

export default function SendAssessmentLinkPage() {
  const { error: toastError, success: toastSuccess } = useToast();

  // Shared reference dropdown cache
  const { data: filterOptions, isLoading: loadingOptions } = useQuery({
    queryKey: queryKeys.reportFilters,
    queryFn: ({ signal }) =>
      portalGet<ReportFilterOptions>("report-filters", undefined, signal),
    staleTime: 5 * 60_000,
  });

  const trainers = filterOptions?.trainers ?? [];
  const courses = filterOptions?.courses ?? [];
  const languages = filterOptions?.languages ?? [];

  // Form states
  const [trainerId, setTrainerId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [trainingDate, setTrainingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Mobile numbers array
  const [mobileNumbers, setMobileNumbers] = useState<Array<string>>([""]);

  // Filter container collapse state matching ReportPageLayout
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Results state
  const [createdRecords, setCreatedRecords] = useState<
    Array<AssessmentRecordItem>
  >([]);
  const [statusBanner, setStatusBanner] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const [isPending, startTransition] = useTransition();

  const handleMobileChange = (index: number, val: string) => {
    const sanitized = sanitizeMobileNumber(val);
    setMobileNumbers((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
  };

  const handleAddMobileField = () => {
    if (mobileNumbers.length >= 20) {
      toastError("Maximum 20 participants can be added at once.");
      return;
    }
    setMobileNumbers((prev) => [...prev, ""]);
  };

  const handleRemoveMobileField = (index: number) => {
    if (mobileNumbers.length <= 1) {
      setMobileNumbers([""]);
      return;
    }
    setMobileNumbers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleReset = () => {
    setTrainerId("");
    setCourseId("");
    setLanguageId("");
    setTrainingDate(new Date().toISOString().split("T")[0]);
    setMobileNumbers([""]);
    setStatusBanner({ show: false, message: "", type: "success" });
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!trainerId) {
      toastError("Please select a Trainer.");
      return;
    }

    if (!courseId) {
      toastError("Please select a Course.");
      return;
    }

    if (!languageId) {
      toastError("Please select a Language.");
      return;
    }

    if (!trainingDate) {
      toastError("Please select the Training Date.");
      return;
    }

    // Filter non-empty mobile numbers
    const validNumbers = mobileNumbers.filter((m) => m.trim().length > 0);

    if (validNumbers.length === 0) {
      toastError("Please enter at least one participant mobile number.");
      return;
    }

    // Validate that each is exactly 10 digits
    const invalidNumbers = validNumbers.filter(
      (num) => !isValidMobileNumber(num)
    );
    if (invalidNumbers.length > 0) {
      toastError(
        `Please enter a valid 10-digit mobile number for: ${invalidNumbers.join(", ")}`
      );
      return;
    }

    startTransition(async () => {
      const res = await sendAssessmentLinkAction({
        trainerId,
        courseId,
        languageId,
        trainingDate,
        mobileNumbers: validNumbers,
      });

      if (res.success) {
        toastSuccess(res.message || "Assessment links sent successfully");
        setStatusBanner({
          show: true,
          message: res.message || "Assessment records created successfully.",
          type: "success",
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCreatedRecords(res.data);
        }
      } else {
        toastError(
          res.error || res.message || "Failed to send assessment links"
        );
        setStatusBanner({
          show: true,
          message:
            res.error || res.message || "Failed to send assessment links.",
          type: "error",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Assessment Link"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Assessment Links", href: "/assessments/links" },
          { label: "Send Assessment Link" },
        ]}
      />

      {/* Filter / Form Container (matching Module-wise Summary layout) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Send Assessment Link to Participants
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <Link href="/assessments/links">
                <ArrowLeft className="h-4 w-4" />
                Back to Assessment Links
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => {
                setFilterCollapsed(!filterCollapsed);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={
                filterCollapsed ? "Expand section" : "Collapse section"
              }
            >
              {filterCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusBanner.show && (
          <div
            className={`mt-4 flex items-start justify-between rounded-md p-3 text-sm transition-all ${
              statusBanner.type === "success"
                ? "border border-[#c6e7c9] bg-[#eef8ee] text-[#246735]"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <span className="leading-relaxed">{statusBanner.message}</span>
            <button
              type="button"
              onClick={() => {
                setStatusBanner((prev) => ({ ...prev, show: false }));
              }}
              className="ml-4 inline-flex shrink-0 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!filterCollapsed && (
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-2xl space-y-4 py-4"
          >
            {/* Trainer Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label
                htmlFor="send-trainer"
                className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pr-4 sm:pb-0 sm:text-right"
              >
                Trainer <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  id="send-trainer"
                  value={trainerId}
                  onChange={(e) => {
                    setTrainerId(e.target.value);
                  }}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label
                htmlFor="send-course"
                className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pr-4 sm:pb-0 sm:text-right"
              >
                Course <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  id="send-course"
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                  }}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label
                htmlFor="send-language"
                className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pr-4 sm:pb-0 sm:text-right"
              >
                Language <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  id="send-language"
                  value={languageId}
                  onChange={(e) => {
                    setLanguageId(e.target.value);
                  }}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select Language</option>
                  {languages.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Training Date */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label
                htmlFor="send-training-date"
                className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pr-4 sm:pb-0 sm:text-right"
              >
                Training Date <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <Input
                  id="send-training-date"
                  type="date"
                  value={trainingDate}
                  onChange={(e) => {
                    setTrainingDate(e.target.value);
                  }}
                  disabled={isPending}
                  required
                  className="h-9 w-full rounded border border-slate-300 bg-white text-sm"
                />
              </div>
            </div>

            {/* Mobile Numbers List */}
            <div className="flex flex-col pt-1 sm:flex-row sm:items-start">
              <label
                htmlFor="send-mobile-0"
                className="w-32 shrink-0 pt-2 pb-1 text-sm font-medium text-slate-700 sm:pr-4 sm:pb-0 sm:text-right"
              >
                Participant Mobiles <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50/70 px-2.5 py-1.5 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>
                    The assessment links will be sent to the mobile numbers
                    entered below.
                  </span>
                </div>

                {mobileNumbers.map((num, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`send-mobile-${idx}`}
                        type="tel"
                        maxLength={10}
                        value={num}
                        onChange={(e) => {
                          handleMobileChange(idx, e.target.value);
                        }}
                        placeholder={`10-digit mobile number ${idx + 1}`}
                        aria-label={`Participant mobile number ${idx + 1}`}
                        disabled={isPending}
                        className="h-9 w-full font-mono text-sm"
                      />
                    </div>
                    {mobileNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleRemoveMobileField(idx);
                        }}
                        disabled={isPending}
                        className="h-9 w-9 text-slate-400 hover:text-rose-600"
                        title="Remove number"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMobileField}
                    disabled={isPending || mobileNumbers.length >= 20}
                    className="gap-1.5 border-dashed border-blue-300 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Another Mobile Number</span>
                  </Button>
                  <span className="text-[11px] text-slate-400">
                    Max 20 numbers at once
                  </span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 min-w-32 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send Links
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
                className="h-9 min-w-24 border-slate-300 text-xs font-medium uppercase"
              >
                Reset
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Assessment Records Created Table (if records returned) */}
      {createdRecords.length > 0 && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Generated Assessment Records ({createdRecords.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-3 py-2.5">Record ID</th>
                  <th className="px-3 py-2.5">Participant Mobile</th>
                  <th className="px-3 py-2.5">Course Name</th>
                  <th className="px-3 py-2.5">Training Date</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {createdRecords.map((r) => (
                  <tr
                    key={r.assessmentRecordId}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="px-3 py-2.5 font-mono font-medium text-slate-800">
                      (ID: {r.assessmentRecordId})
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">
                      {r.mobileNumber}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {r.courseName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.trainingDate || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {r.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
