"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { exportTrainerAccessLogsAction } from "@/features/reports/action";
import { ReportPageLayout } from "@/features/reports/components/report-page-layout";
import type { ReportFilterState } from "@/features/reports/components/report-page-layout";
import { parseCsv } from "@/lib/csv-parser";
import type { CsvRow } from "@/lib/csv-parser";

export default function TrainerAccessLogsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [rows, setRows] = useState<Array<CsvRow>>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchLogs = async (filters: ReportFilterState, showToast = false) => {
    const res = await exportTrainerAccessLogsAction({
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
        toastSuccess("Trainer access logs loaded successfully");
      }
    } else {
      toastError(res.error || "Failed to load trainer access logs");
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
          <span className="font-mono text-xs font-semibold text-slate-800">
            {r["User ID"] || "—"}
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Trainer Name",
        cell: (r) => (
          <span className="text-xs font-semibold text-slate-900">
            {r["Trainer Name"] || "—"}
          </span>
        ),
      },
      {
        header: "Login ID",
        cell: (r) => (
          <span
            className="block max-w-[200px] truncate font-mono text-[11px] text-slate-600"
            title={r["Login ID"]}
          >
            {r["Login ID"] || "—"}
          </span>
        ),
      },
      {
        header: "Login Date Time",
        cell: (r) => {
          const val = r["Login Date Time"];
          const formatted = val ? new Date(val).toLocaleString() : "—";
          return (
            <span className="text-xs whitespace-nowrap text-slate-700">
              {formatted === "Invalid Date" ? val : formatted}
            </span>
          );
        },
        className: "w-44",
      },
      {
        header: "Login IP",
        cell: (r) => (
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
            {r["Login IP"] || "—"}
          </span>
        ),
        className: "w-32 text-center",
      },
      {
        header: "Logout Time",
        cell: (r) => {
          const val = r["Logout Time"];
          const formatted = val ? new Date(val).toLocaleString() : "—";
          return (
            <span className="text-xs whitespace-nowrap text-slate-600">
              {formatted === "Invalid Date" ? val || "—" : formatted}
            </span>
          );
        },
        className: "w-44",
      },
    ],
    [page, pageSize]
  );

  return (
    <ReportPageLayout
      title="Trainer Access Logs"
      breadcrumbTitle="Trainer Access Logs"
      fields={["trainer", "dateRange"]}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchLogs(filters, true);
      }}
      onGenerate={(filters) =>
        exportTrainerAccessLogsAction({
          trainerId: filters.trainer || "",
          startDate: filters.startDate || "",
          endDate: filters.endDate || "",
        })
      }
    >
      <div className="space-y-4">
        {hasLoaded && (
          <DataTable
            title="Access Log Records"
            columns={columns}
            data={pagedRows}
            getRowId={(r, idx) =>
              r._rowId ||
              (r["Login ID"] ? `${r["Login ID"]}-${idx}` : `access-log-${idx}`)
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
                  placeholder="Search logs..."
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
