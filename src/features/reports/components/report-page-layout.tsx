"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Loader2, Minus, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getReportFilterOptionsAction, type ExportReportResult } from "../action";

export type FilterFieldType =
  | "language"
  | "course"
  | "modeOfTraining"
  | "division"
  | "region"
  | "trainer"
  | "dateRange";

export interface ReportFilterState {
  languageId?: string;
  courseId?: string;
  modeOfTraining?: string;
  division?: string;
  region?: string;
  trainer?: string;
  startDate?: string;
  endDate?: string;
  emails?: string;
}

export interface ReportPageLayoutProps {
  title: string;
  breadcrumbTitle?: string;
  defaultEmail?: string;
  fields?: FilterFieldType[];
  onGenerate: (filters: ReportFilterState) => Promise<ExportReportResult>;
  onViewReport?: (filters: ReportFilterState) => Promise<void> | void;
  autoFetchOnMount?: boolean;
  children?: React.ReactNode;
  splitRightSlot?: React.ReactNode;
  layoutMode?: "stacked" | "split";
  cardTitle?: string;
  showEmailSection?: boolean;
}

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
  const [languages, setLanguages] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);

  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [modeOfTraining, setModeOfTraining] = useState("PHYSICAL");
  const [division, setDivision] = useState("");
  const [region, setRegion] = useState("");
  const [trainer, setTrainer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emails, setEmails] = useState(defaultEmail);

  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const [statusBanner, setStatusBanner] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const [downloadLink, setDownloadLink] = useState<{ url: string; filename: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isViewPending, startViewTransition] = useTransition();

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
    getReportFilterOptionsAction().then((res) => {
      if (res.languages) setLanguages(res.languages);
      if (res.courses) setCourses(res.courses);
      if (res.trainers) setTrainers(res.trainers);
      if (res.userEmail && !emails) {
        setEmails(res.userEmail);
      }
    });

    if (onViewReport && autoFetchOnMount) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = () => {
    setStatusBanner({ show: false, message: "", type: "success" });
    setDownloadLink(null);

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
        const filename = res.filename || `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;

        setDownloadLink({ url, filename });

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
    if (!onViewReport) return;
    startViewTransition(async () => {
      await onViewReport(currentFilters);
    });
  };

  const hasField = (f: FilterFieldType) => fields.includes(f);

  const filterFormCard = (
    <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      {/* Card Title with optional Collapse for Split mode */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">
          {cardTitle || (layoutMode === "split" ? "Filter" : title)}
        </h2>
        {layoutMode === "split" && (
          <button
            type="button"
            onClick={() => setFilterCollapsed((v) => !v)}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            {filterCollapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Status Notification Banner */}
      {statusBanner.show && (
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
      )}

      {!filterCollapsed && (
        <div className={layoutMode === "split" ? "space-y-3.5" : "mx-auto max-w-2xl space-y-4 py-2"}>
          {/* Mode of Training */}
          {hasField("modeOfTraining") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Training
              </label>
              <div className="flex-1">
                <select
                  value={modeOfTraining}
                  onChange={(e) => setModeOfTraining(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="PHYSICAL">PHYSICAL</option>
                  <option value="VIRTUAL">VIRTUAL</option>
                </select>
              </div>
            </div>
          )}

          {/* Trainer */}
          {hasField("trainer") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Trainer
              </label>
              <div className="flex-1">
                {trainers.length > 0 ? (
                  <select
                    value={trainer}
                    onChange={(e) => setTrainer(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Trainers</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={trainer}
                    onChange={(e) => setTrainer(e.target.value)}
                    placeholder="Enter trainer name or id"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* Division */}
          {hasField("division") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Division
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="Enter division"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Region */}
          {hasField("region") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Region
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Enter region"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Languages */}
          {hasField("language") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Languages
              </label>
              <div className="flex-1">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Languages</option>
                  {languages.map((l, idx) => (
                    <option key={l.id ? `lang-${l.id}` : `lang-idx-${idx}`} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Courses */}
          {hasField("course") && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                Courses
              </label>
              <div className="flex-1">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courses.map((c, idx) => (
                    <option key={c.id ? `course-${c.id}` : `course-idx-${idx}`} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date Range */}
          {hasField("dateRange") && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="w-28 shrink-0 pb-1 text-sm font-medium text-slate-700 sm:pb-0 sm:pr-4 sm:text-right">
                  Start Date
                </label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="dd----yyyy"
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
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="dd----yyyy"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* EMAIL REPORT TO SECTION (For export downloads) */}
          {showEmailSection && (
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
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="Enter email addresses"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500">
                    You can enter multiple emails, seperated by comma
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {onViewReport && (
                <button
                  type="button"
                  onClick={handleViewReportClick}
                  disabled={isViewPending}
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
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
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

            {showEmailSection && (
              <div className="text-xs text-[#0ea5e9] font-medium max-w-md leading-relaxed space-y-0.5">
                <p>Your report will be generated after you click on generate report button.</p>
                <p>It will be available for download below.</p>
              </div>
            )}

            {downloadLink && (
              <div className="mt-4 pt-4 border-t border-slate-200 w-full flex flex-col items-center">
                <a
                  href={downloadLink.url}
                  download={downloadLink.filename}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download {downloadLink.filename}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb header */}
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
