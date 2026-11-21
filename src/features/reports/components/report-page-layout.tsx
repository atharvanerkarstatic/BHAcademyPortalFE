"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';

import { PageHeader } from "@/components/common/page-header";
import type { ExportReportResult, ReportFilterOptions } from "@/features/reports/action";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { useReportFiltersStore } from "@/stores/report-filters-store";

export type FilterFieldType =
  | "language"
  | "course"
  | "modeOfTraining"
  | "division"
  | "region"
  | "trainer"
  | "dateRange";

export type ReportFilterState = {
  languageId?: string;
  courseId?: string;
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  startDate?: string;
  endDate?: string;
  emails?: string;
};

export type ReportPageLayoutProps = {
  title: string;
  breadcrumbTitle?: string;
  defaultEmail?: string;
  fields?: Array<FilterFieldType>;
  onGenerate: (filters: ReportFilterState) => Promise<ExportReportResult>;
  onViewReport?: (filters: ReportFilterState) => Promise<void> | void;
  autoFetchOnMount?: boolean;
  children?: ReactNode;
  splitRightSlot?: ReactNode;
  layoutMode?: "stacked" | "split";
  cardTitle?: string;
  showEmailSection?: boolean;
};

export function ReportPageLayout({
  title,
  breadcrumbTitle,
  defaultEmail = "satyam.pattnaik@stetig.in",
  fields = ["language", "course", "dateRange"],
  onGenerate,
  onViewReport,
  autoFetchOnMount = true,
  children,
  splitRightSlot,
  layoutMode = "stacked",
  cardTitle,
  showEmailSection = true,
}: ReportPageLayoutProps) {
  const { data: filterOptions } = useQuery({
    queryKey: queryKeys.reportFilters,
    queryFn: ({ signal }) => portalGet<ReportFilterOptions>("report-filters", undefined, signal),
    staleTime: 5 * 60_000,
  });

  const languages = filterOptions?.languages ?? [];
  const courses = filterOptions?.courses ?? [];
  const trainers = filterOptions?.trainers ?? [];

  const selectedLanguage = useReportFiltersStore((state) => state.languageId);
  const selectedCourse = useReportFiltersStore((state) => state.courseId);
  const modeOfTraining = useReportFiltersStore((state) => state.modeOfTraining);
  const division = useReportFiltersStore((state) => state.division);
  const region = useReportFiltersStore((state) => state.region);
  const trainer = useReportFiltersStore((state) => state.trainer);
  const startDate = useReportFiltersStore((state) => state.startDate);
  const endDate = useReportFiltersStore((state) => state.endDate);
  const storedEmails = useReportFiltersStore((state) => state.emails);
  const filterCollapsed = useReportFiltersStore((state) => state.filterCollapsed);
  const setField = useReportFiltersStore((state) => state.setField);
  const toggleFilterCollapsed = useReportFiltersStore((state) => state.toggleFilterCollapsed);

  const emails = storedEmails || filterOptions?.userEmail || defaultEmail;

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
  const [isViewPending, startViewTransition] = useTransition();
  const didAutoFetch = useRef(false);

  const currentFilters: ReportFilterState = {
    languageId: selectedLanguage,
    courseId: selectedCourse,
    modeOfTraining,
    division,
    region,
    trainer,
    startDate,
    endDate,
    emails,
  };

  useEffect(() => {
    if (didAutoFetch.current || !onViewReport || !autoFetchOnMount) {
      return;
    }
    didAutoFetch.current = true;
    startViewTransition(async () => {
      await onViewReport({
        modeOfTraining: "PHYSICAL",
        languageId: "",
        courseId: "",
        division: "",
        region: "",
        trainer: "",
        startDate: "",
        endDate: "",
      });
    });
  }, [autoFetchOnMount, onViewReport]);

  const handleGenerate = () => {
    setStatusBanner({ show: false, message: "", type: "success" });

    startTransition(async () => {
      const res = await onGenerate(currentFilters);

      if (res.success && res.data) {
        setStatusBanner({
          show: true,
          type: "success",
          message:
            "Your report generation has started. You can check back this page in few minutes to find the download link. You will also receive the download link on the email ID(s) entered.",
        });

        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const filename = res.filename || `${title.toLowerCase().replaceAll(/\s+/g, "-")}.csv`;

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        setStatusBanner({
          show: true,
          type: "error",
          message: res.error || "Failed to generate report. Please try again.",
        });
      }
    });
  };

  const handleViewReportClick = () => {
    if (!onViewReport) {
      return;
    }
    startViewTransition(async () => {
      await onViewReport(currentFilters);
    });
  };

  const hasField = (field: FilterFieldType) => fields.includes(field);

  const filterFormCard = (
    <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">
          {cardTitle || (layoutMode === "split" ? "Filter" : title)}
        </h2>
        {layoutMode === "split" ? (
          <button
            type="button"
            onClick={toggleFilterCollapsed}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            {filterCollapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {statusBanner.show ? (
        <div
          className={`mb-6 flex items-start justify-between rounded-md p-3 text-sm transition-all ${
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
      ) : null}

      {!filterCollapsed ? (
        <div className={layoutMode === "split" ? "space-y-3.5" : "mx-auto max-w-2xl space-y-4 py-2"}>
          {hasField("modeOfTraining") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Training
              </label>
              <div className="flex-1">
                <select
                  value={modeOfTraining}
                  onChange={(event) => setField("modeOfTraining", event.target.value)}
                  suppressHydrationWarning
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PHYSICAL">PHYSICAL</option>
                  <option value="VIRTUAL">VIRTUAL</option>
                </select>
              </div>
            </div>
          ) : null}

          {hasField("trainer") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Trainer
              </label>
              <div className="flex-1">
                {trainers.length > 0 ? (
                  <select
                    value={trainer}
                    onChange={(event) => setField("trainer", event.target.value)}
                    suppressHydrationWarning
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Trainers</option>
                    {trainers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={trainer}
                    onChange={(event) => setField("trainer", event.target.value)}
                    placeholder="Enter trainer name or id"
                    suppressHydrationWarning
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          ) : null}

          {hasField("division") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Division
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={division}
                  onChange={(event) => setField("division", event.target.value)}
                  placeholder="Enter division"
                  suppressHydrationWarning
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : null}

          {hasField("region") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Region
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={region}
                  onChange={(event) => setField("region", event.target.value)}
                  placeholder="Enter region"
                  suppressHydrationWarning
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : null}

          {hasField("language") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Languages
              </label>
              <div className="flex-1">
                <select
                  value={selectedLanguage}
                  onChange={(event) => setField("languageId", event.target.value)}
                  suppressHydrationWarning
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Languages</option>
                  {languages.map((lang, idx) => (
                    <option key={lang.id ? `lang-${lang.id}` : `lang-idx-${idx}`} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {hasField("course") ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Courses
              </label>
              <div className="flex-1">
                <select
                  value={selectedCourse}
                  onChange={(event) => setField("courseId", event.target.value)}
                  suppressHydrationWarning
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courses.map((course, idx) => (
                    <option
                      key={course.id ? `course-${course.id}` : `course-idx-${idx}`}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {hasField("dateRange") ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                  Start Date
                </label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setField("startDate", event.target.value)}
                    placeholder="dd----yyyy"
                    suppressHydrationWarning
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                  End Date
                </label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setField("endDate", event.target.value)}
                    placeholder="dd----yyyy"
                    suppressHydrationWarning
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          ) : null}

          {showEmailSection ? (
            <div className="pt-2">
              <div className="flex">
                <div className="w-28 shrink-0 hidden sm:block" />
                <h3 className="text-sm font-bold text-[#0088ff] uppercase tracking-wide mb-2">
                  EMAIL REPORT TO:
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start">
                <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right sm:pt-1.5">
                  Enter Email Id&apos;s
                </label>
                <div className="flex-1 space-y-1">
                  <textarea
                    rows={2}
                    value={emails}
                    onChange={(event) => setField("emails", event.target.value)}
                    placeholder="Enter email addresses"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500">
                    You can enter multiple emails, seperated by comma
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="pt-4 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {onViewReport ? (
                <button
                  type="button"
                  onClick={handleViewReportClick}
                  disabled={isViewPending}
                  suppressHydrationWarning
                  className="inline-flex items-center justify-center rounded bg-[#0070e0] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {isViewPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      LOADING...
                    </>
                  ) : (
                    "VIEW REPORT"
                  )}
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                suppressHydrationWarning
                className="inline-flex items-center justify-center rounded bg-[#0070e0] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    GENERATING...
                  </>
                ) : (
                  "GENERATE REPORT"
                )}
              </button>
            </div>

            {showEmailSection ? (
              <div className="text-xs text-[#0ea5e9] font-medium max-w-md leading-relaxed space-y-0.5">
                <p>Your report will be generated after you click on generate report button.</p>
                <p>It will be available for download below.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
          { label: breadcrumbTitle || title },
        ]}
      />

      {layoutMode === "split" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">{filterFormCard}</div>
            <div className="lg:col-span-7">{splitRightSlot}</div>
          </div>
          {children}
        </div>
      ) : (
        <div className="space-y-6">
          {filterFormCard}
          {children}
        </div>
      )}
    </div>
  );
}
