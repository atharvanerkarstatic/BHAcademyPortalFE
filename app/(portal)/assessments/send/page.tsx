"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Plus,
  Send,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getReportFilterOptionsAction } from "@/features/reports/action";
import { sendAssessmentLinkAction } from "@/features/assessments/action";
import type { AssessmentRecordItem } from "@/features/assessments/types";
import {
  isValidMobileNumber,
  sanitizeMobileNumber,
} from "@/lib/validations";

export default function SendAssessmentLinkPage() {
  const { error: toastError, success: toastSuccess } = useToast();

  // Dropdown options
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [languages, setLanguages] = useState<{ id: string; name: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form states
  const [trainerId, setTrainerId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [trainingDate, setTrainingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Mobile numbers array
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([""]);

  // Filter container collapse state matching ReportPageLayout
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Results state
  const [createdRecords, setCreatedRecords] = useState<AssessmentRecordItem[]>([]);
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

  useEffect(() => {
    let mounted = true;
    getReportFilterOptionsAction()
      .then((res) => {
        if (!mounted) return;
        if (res.trainers) setTrainers(res.trainers);
        if (res.courses) setCourses(res.courses);
        if (res.languages) setLanguages(res.languages);
      })
      .catch((err) => {
        console.error("Failed to load options for Send Assessment:", err);
      })
      .finally(() => {
        if (mounted) setLoadingOptions(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
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
    const invalidNumbers = validNumbers.filter((num) => !isValidMobileNumber(num));
    if (invalidNumbers.length > 0) {
      toastError(`Please enter a valid 10-digit mobile number for: ${invalidNumbers.join(", ")}`);
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
        toastError(res.error || res.message || "Failed to send assessment links");
        setStatusBanner({
          show: true,
          message: res.error || res.message || "Failed to send assessment links.",
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
              onClick={() => setFilterCollapsed(!filterCollapsed)}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={filterCollapsed ? "Expand section" : "Collapse section"}
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
                ? "bg-[#eef8ee] text-[#246735] border border-[#c6e7c9]"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span className="leading-relaxed">{statusBanner.message}</span>
            <button
              type="button"
              onClick={() => setStatusBanner((prev) => ({ ...prev, show: false }))}
              className="ml-4 inline-flex shrink-0 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!filterCollapsed && (
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 py-4">
            {/* Trainer Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Trainer <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
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
              <label className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Course <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
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
              <label className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Language <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  value={languageId}
                  onChange={(e) => setLanguageId(e.target.value)}
                  disabled={loadingOptions || isPending}
                  required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
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
              <label className="w-32 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Training Date <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1">
                <Input
                  type="date"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  disabled={isPending}
                  required
                  className="h-9 w-full rounded border border-slate-300 bg-white text-sm"
                />
              </div>
            </div>

            {/* Mobile Numbers List */}
            <div className="flex flex-col sm:flex-row sm:items-start pt-1">
              <label className="w-32 shrink-0 pb-1 pt-2 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Participant Mobiles <span className="text-rose-500">*</span>
              </label>
              <div className="flex-1 space-y-2">
                {mobileNumbers.map((num, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="tel"
                        maxLength={10}
                        value={num}
                        onChange={(e) => handleMobileChange(idx, e.target.value)}
                        placeholder={`10-digit mobile number ${idx + 1}`}
                        disabled={isPending}
                        className="h-9 w-full font-mono text-sm"
                      />
                    </div>
                    {mobileNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMobileField(idx)}
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
                    className="gap-1.5 text-xs text-blue-600 border-dashed border-blue-300 hover:bg-blue-50"
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
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-32 bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold uppercase h-9"
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
                className="min-w-24 border-slate-300 text-xs font-medium uppercase h-9"
              >
                Reset
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Assessment Records Created Table (if records returned) */}
      {createdRecords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Generated Assessment Records ({createdRecords.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Record ID</th>
                  <th className="py-2.5 px-3">Participant Mobile</th>
                  <th className="py-2.5 px-3">Course Name</th>
                  <th className="py-2.5 px-3">Training Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {createdRecords.map((r) => (
                  <tr key={r.assessmentRecordId} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      (ID: {r.assessmentRecordId})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {r.mobileNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {r.courseName || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.trainingDate || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
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

