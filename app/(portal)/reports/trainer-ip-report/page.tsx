"use client";

import { useMemo, useState } from "react";
import { ReportPageLayout, type ReportFilterState } from "@/features/reports/components/report-page-layout";
import { exportTrainerIpReportAction } from "@/features/reports/action";
import { DataTable, type Column } from "@/components/common/data-table";
import { parseCsv } from "@/lib/csv-parser";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface TrainerIpReportRow {
  "User ID": string;
  "Participant Name": string;
  Mobile: string;
  "Course ID": string;
  "Course Name": string;
  "Language ID": string;
  "Trainer ID": string;
  "Trainer Name": string;
  "Assessment Link ID": string;
  "Total Questions": string;
  "Right Answers": string;
  "Assessment Result": string;
  "Assessment Date": string;
  "Assessment IP": string;
  "Assessment User Agent": string;
  "Training Date": string;
  [key: string]: string;
}

export default function TrainerIpReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [rows, setRows] = useState<TrainerIpReportRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchReport = async (filters: ReportFilterState, showToast = false) => {
    const res = await exportTrainerIpReportAction({
      trainerId: filters.trainer || "",
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
    });

    if (res.success && res.data) {
      const parsed = parseCsv<TrainerIpReportRow>(res.data);
      setRows(parsed);
      setHasLoaded(true);
      setPage(1);
      if (showToast) {
        toastSuccess("Trainer IP report loaded successfully");
      }
    } else {
      toastError(res.error || "Failed to load trainer IP report");
    }
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const columns: Column<TrainerIpReportRow>[] = useMemo(
    () => [
      {
        header: "#",
        cell: (_, idx?: number) => (
          <span className="font-mono text-xs text-slate-500">
            {(page - 1) * pageSize + (idx ?? 0) + 1}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        header: "User ID",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-600">
            {r["User ID"] || "—"}
          </span>
        ),
        className: "w-24 text-center",
      },
      {
        header: "Participant Name",
        cell: (r) => (
          <div className="space-y-0.5">
            <span className="font-semibold text-xs text-slate-900 block">
              {r["Participant Name"] || "—"}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {r.Mobile || "—"}
            </span>
          </div>
        ),
      },
      {
        header: "Course",
        cell: (r) => (
          <div className="space-y-0.5">
            <span className="font-medium text-xs text-slate-800 block">
              {r["Course Name"] || "—"}
            </span>
            {r["Course ID"] && (
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {r["Course ID"]}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Trainer",
        cell: (r) => (
          <div className="space-y-0.5">
            <span className="font-medium text-xs text-slate-800 block">
              {r["Trainer Name"] || "—"}
            </span>
            {r["Trainer ID"] && (
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {r["Trainer ID"]}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Score",
        cell: (r) => (
          <span className="text-xs text-slate-700 font-mono">
            {r["Right Answers"] ?? 0} / {r["Total Questions"] ?? 0}
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Result",
        cell: (r) => {
          const res = (r["Assessment Result"] || "").toUpperCase();
          const isPassed = res === "PASS" || res === "PASSED" || res === "ACTIVE";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                isPassed
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {res || "—"}
            </span>
          );
        },
        className: "w-24 text-center",
      },
      {
        header: "IP Address",
        cell: (r) => (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
            {r["Assessment IP"] || "—"}
          </span>
        ),
        className: "w-32 text-center",
      },
      {
        header: "Training Date",
        cell: (r) => (
          <span className="text-xs text-slate-600 whitespace-nowrap font-mono">
            {r["Training Date"] || "—"}
          </span>
        ),
        className: "w-28 text-center",
      },
    ],
    [page, pageSize]
  );

  return (
    <ReportPageLayout
      title="Trainer IP Report"
      breadcrumbTitle="Trainer IP Report"
      fields={["trainer", "dateRange"]}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchReport(filters, true);
      }}
      onGenerate={async (filters) => {
        return exportTrainerIpReportAction({
          trainerId: filters.trainer || "",
          startDate: filters.startDate || "",
          endDate: filters.endDate || "",
        });
      }}
    >
      <div className="space-y-4">
        {hasLoaded && (
          <DataTable
            title="Trainer Assessment IP Records"
            columns={columns}
            data={pagedRows}
            getRowId={(r, idx) => r._rowId || (r["Assessment Link ID"] ? `${r["Assessment Link ID"]}-${idx}` : `row-${idx}`)}
            emptyMessage={search ? `No records matching "${search}"` : "No assessment IP records found for the selected criteria."}
            headerRight={
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-44 pl-8 pr-3 text-xs sm:w-56"
                />
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalElements: filteredRows.length,
              totalPages: Math.max(1, Math.ceil(filteredRows.length / pageSize)),
              onPageChange: (p) => setPage(p),
            }}
          />
        )}
      </div>
    </ReportPageLayout>
  );
}

