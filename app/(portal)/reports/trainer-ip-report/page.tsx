"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { exportTrainerIpReportAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import type { ReportFilterState } from "@/features/reports/components/report-page-layout";
import { parseCsv } from "@/lib/csv-parser";
import type { CsvRow } from "@/lib/csv-parser";

export default function TrainerIpReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [rows, setRows] = useState<Array<CsvRow>>([]);
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

    if (res.success) {
      const parsed = parseCsv(res.data ?? "");
      setRows(parsed);
      setHasLoaded(true);
      setPage(1);
      if (showToast && parsed.length > 0) {
        toastSuccess("Trainer IP report loaded successfully");
      }
    } else {
      toastError(res.error || "Failed to load trainer IP report");
    }
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) {
      return rows;
    }
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((val) => val.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const columns: Array<Column<CsvRow>> = useMemo(
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
            <span className="block text-xs font-semibold text-slate-900">
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
            <span className="block text-xs font-medium text-slate-800">
              {r["Course Name"] || "—"}
            </span>
            {r["Course ID"] && (
              <span className="font-mono text-[10px] text-slate-400">
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
            <span className="block text-xs font-medium text-slate-800">
              {r["Trainer Name"] || "—"}
            </span>
            {r["Trainer ID"] && (
              <span className="font-mono text-[10px] text-slate-400">
                ID: {r["Trainer ID"]}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Score",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-700">
            {r["Right Answers"] ?? 0} / {r["Total Questions"] ?? 0}
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Result",
        cell: (r) => {
          const res = (r["Assessment Result"] || "").toUpperCase();
          const isPassed =
            res === "PASS" || res === "PASSED" || res === "ACTIVE";
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                isPassed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
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
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
            {r["Assessment IP"] || "—"}
          </span>
        ),
        className: "w-32 text-center",
      },
      {
        header: "Training Date",
        cell: (r) => (
          <span className="font-mono text-xs whitespace-nowrap text-slate-600">
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
      onGenerate={(filters) =>
        exportTrainerIpReportAction({
          trainerId: filters.trainer || "",
          startDate: filters.startDate || "",
          endDate: filters.endDate || "",
        })
      }
    >
      <div className="space-y-4">
        {hasLoaded && (
          <DataTable
            title="Trainer Assessment IP Records"
            columns={columns}
            data={pagedRows}
            getRowId={(r, idx) =>
              r._rowId ||
              (r["Assessment Link ID"]
                ? `${r["Assessment Link ID"]}-${idx}`
                : `row-${idx}`)
            }
            emptyMessage={
              rows.length === 0
                ? "No records found"
                : `No records matching "${search}"`
            }
            headerRight={
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-44 pr-3 pl-8 text-xs sm:w-56"
                />
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalElements: filteredRows.length,
              totalPages: Math.max(
                1,
                Math.ceil(filteredRows.length / pageSize)
              ),
              onPageChange: (p) => {
                setPage(p);
              },
            }}
          />
        )}
      </div>
    </ReportPageLayout>
  );
}
