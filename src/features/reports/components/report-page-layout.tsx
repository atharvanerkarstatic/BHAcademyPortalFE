"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getReportFilterOptionsAction, type ExportReportResult } from "../action";

export type FilterFieldType = "language" | "course" | "modeOfTraining" | "division" | "region" | "trainer" | "dateRange";

export interface ReportPageLayoutProps {
  title: string;
  defaultEmail?: string;
  fields?: FilterFieldType[];
  onGenerate: (filters: ReportFilterState) => Promise<ExportReportResult>;
}

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

export function ReportPageLayout({
  title,
  defaultEmail = "",
  fields = ["language", "course", "dateRange"],
  onGenerate,
}: ReportPageLayoutProps) {
  const [languages, setLanguages] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [modeOfTraining, setModeOfTraining] = useState("PHYSICAL");
  const [division, setDivision] = useState("");
  const [region, setRegion] = useState("");
  const [trainer, setTrainer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emails, setEmails] = useState(defaultEmail);

  const [statusBanner, setStatusBanner] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const [downloadLink, setDownloadLink] = useState<{ url: string; filename: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getReportFilterOptionsAction().then((res) => {
      if (res.languages) setLanguages(res.languages);
      if (res.courses) setCourses(res.courses);
    });
  }, []);

  const handleGenerate = () => {
    setStatusBanner({ show: false, message: "", type: "success" });
    setDownloadLink(null);

    startTransition(async () => {
      const res = await onGenerate({
        languageId: selectedLanguage,
        courseId: selectedCourse,
        modeOfTraining,
        division,
        region,
        trainer,
        startDate,
        endDate,
        emails,
      });

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

        // Auto trigger download
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

  const hasField = (f: FilterFieldType) => fields.includes(f);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
          { label: title },
        ]}
      />

      {/* Main Container Card with blue top accent */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Blue top border line */}
        <div className="h-1.5 w-full bg-blue-500 rounded-t-2xl" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Section Heading */}
          <h2 className="text-xl font-bold tracking-tight text-slate-800">{title}</h2>

          {/* Status Message / Notification Banner */}
          {statusBanner.show && (
            <div
              className={`flex items-start justify-between rounded-lg p-3.5 text-sm transition-all ${
                statusBanner.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <span>{statusBanner.message}</span>
              <button
                type="button"
                onClick={() => setStatusBanner((prev) => ({ ...prev, show: false }))}
                className="ml-3 inline-flex text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form Filter Grid / Rows */}
          <div className="max-w-3xl mx-auto space-y-4 py-2">
            {/* Mode of Training */}
            {hasField("modeOfTraining") && (
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Mode of Training
                </label>
                <div className="md:col-span-9">
                  <select
                    value={modeOfTraining}
                    onChange={(e) => setModeOfTraining(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Modes</option>
                    <option value="PHYSICAL">PHYSICAL</option>
                    <option value="VIRTUAL">VIRTUAL</option>
                  </select>
                </div>
              </div>
            )}

            {/* Division */}
            {hasField("division") && (
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Division
                </label>
                <div className="md:col-span-9">
                  <input
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Enter division"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Region */}
            {hasField("region") && (
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Region
                </label>
                <div className="md:col-span-9">
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Enter region"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Trainer */}
            {hasField("trainer") && (
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Trainer
                </label>
                <div className="md:col-span-9">
                  <input
                    type="text"
                    value={trainer}
                    onChange={(e) => setTrainer(e.target.value)}
                    placeholder="Enter trainer name or id"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Languages */}
            {hasField("language") && (
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Languages
                </label>
                <div className="md:col-span-9">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                  Courses
                </label>
                <div className="md:col-span-9">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                  <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                    Start Date
                  </label>
                  <div className="md:col-span-9">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="dd-mm-yyyy"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4">
                  <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right">
                    End Date
                  </label>
                  <div className="md:col-span-9">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="dd-mm-yyyy"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* EMAIL REPORT TO SECTION */}
            <div className="pt-4">
              <h3 className="text-sm font-bold text-sky-500 tracking-wide mb-3 md:ml-[25%] uppercase">
                Email Report To:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 items-start gap-2 md:gap-4">
                <label className="md:col-span-3 text-sm font-medium text-slate-700 md:text-right pt-2">
                  Enter Email Id&apos;s
                </label>
                <div className="md:col-span-9 space-y-1.5">
                  <textarea
                    rows={2}
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="Enter email addresses"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500">
                    You can enter multiple emails, seperated by comma
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button & Instructions */}
            <div className="pt-6 flex flex-col items-center justify-center text-center space-y-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-md bg-[#0070e0] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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

              <div className="text-xs text-sky-500 font-medium max-w-md leading-relaxed">
                <p>Your report will be generated after you click on generate report button.</p>
                <p>It will be available for download below.</p>
              </div>

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
        </div>
      </div>
    </div>
  );
}

