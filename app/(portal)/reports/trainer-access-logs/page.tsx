"use client";

import { useMemo, useState } from "react";
import { ReportPageLayout, type ReportFilterState } from "@/features/reports/components/report-page-layout";
import { exportTrainerAccessLogsAction } from "@/features/reports/action";
import { DataTable, type Column } from "@/components/common/data-table";
import { parseCsv } from "@/lib/csv-parser";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface TrainerAccessLogRow {
  "User ID": string;
  "Trainer Name": string;
  "Login ID": string;
  "Login Date Time": string;
  "Login IP": string;
  "Logout Time": string;
  [key: string]: string;
}

export default function TrainerAccessLogsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [rows, setRows] = useState<TrainerAccessLogRow[]>([]);
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

    if (res.success && res.data) {
      const parsed = parseCsv<TrainerAccessLogRow>(res.data);
      setRows(parsed);
      setHasLoaded(true);
      setPage(1);
      if (showToast) {
        toastSuccess("Trainer access logs loaded successfully");
      }
    } else {
      toastError(res.error || "Failed to load trainer access logs");
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

  const columns: Column<TrainerAccessLogRow>[] = useMemo(
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
          <span className="font-semibold text-xs text-slate-900">
            {r["Trainer Name"] || "—"}
          </span>
        ),
      },
      {
        header: "Login ID",
        cell: (r) => (
          <span className="font-mono text-[11px] text-slate-600 block truncate max-w-[200px]" title={r["Login ID"]}>
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
            <span className="text-xs text-slate-700 whitespace-nowrap">
              {formatted !== "Invalid Date" ? formatted : val}
            </span>
          );
        },
        className: "w-44",
      },
      {
        header: "Login IP",
        cell: (r) => (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
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
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {formatted !== "Invalid Date" ? formatted : val || "—"}
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
      onGenerate={async (filters) => {
        return exportTrainerAccessLogsAction({
          trainerId: filters.trainer || "",
          startDate: filters.startDate || "",
          endDate: filters.endDate || "",
        });
      }}
    >
      <div className="space-y-4">
        {hasLoaded && (
          <DataTable
            title="Access Log Records"
            columns={columns}
            data={pagedRows}
            getRowId={(r, idx) => r._rowId || (r["Login ID"] ? `${r["Login ID"]}-${idx}` : `access-log-${idx}`)}
            emptyMessage={search ? `No records matching "${search}"` : "No access logs found for the selected criteria."}
            headerRight={
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search logs..."
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

