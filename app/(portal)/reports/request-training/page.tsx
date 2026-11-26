"use client";

import { useMemo, useState } from "react";
import {
  ReportPageLayout,
  type ReportFilterState,
} from "@/features/reports/components/report-page-layout";
import { exportRequestTrainingAction } from "@/features/reports/action";
import { DataTable, type Column } from "@/components/common/data-table";
import { parseCsv } from "@/lib/csv-parser";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface RequestTrainingRow {
  id: string;
  name: string;
  mobile: string;
  consent: string;
  topicId: string;
  topic: string;
  pincodeId: string;
  pincode: string;
  city: string;
  state: string;
  region: string;
  division: string;
  professionId: string;
  profession: string;
  bhBp: string;
  accountName: string;
  msBp: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  [key: string]: string;
}

export default function RequestTrainingReportPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [rows, setRows] = useState<RequestTrainingRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchReport = async (filters: ReportFilterState, showToast = false) => {
    const res = await exportRequestTrainingAction({
      from: filters.startDate || "",
      to: filters.endDate || "",
    });

    if (res.success) {
      const parsed = parseCsv<RequestTrainingRow>(res.data ?? "");
      setRows(parsed);
      setHasLoaded(true);
      setPage(1);
      if (showToast && parsed.length > 0) {
        toastSuccess("Request training data loaded successfully");
      }
    } else {
      toastError(res.error || "Failed to load request training data");
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

  const columns: Column<RequestTrainingRow>[] = useMemo(
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
        header: "ID",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {r.id || "—"}
          </span>
        ),
        className: "w-16 text-center",
      },
      {
        header: "Name",
        cell: (r) => (
          <div className="font-semibold text-xs text-slate-900 leading-snug">
            {r.name || "—"}
          </div>
        ),
        className: "min-w-32",
      },
      {
        header: "Mobile",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-700">
            {r.mobile || "—"}
          </span>
        ),
        className: "w-28",
      },
      {
        header: "Topic",
        cell: (r) => (
          <div className="text-xs text-slate-800 max-w-xs">
            <span className="font-medium">{r.topic || "—"}</span>
            {r.topicId && (
              <span className="ml-1 text-[11px] text-slate-400 font-mono">
                (#{r.topicId})
              </span>
            )}
          </div>
        ),
        className: "min-w-36",
      },
      {
        header: "Location",
        cell: (r) => (
          <div className="text-xs text-slate-700 space-y-0.5">
            <div>
              {r.city ? `${r.city}` : "—"}
              {r.state ? `, ${r.state}` : ""}
            </div>
            {r.pincode && (
              <div className="text-[11px] font-mono text-slate-500">
                PIN: {r.pincode}
              </div>
            )}
          </div>
        ),
        className: "min-w-32",
      },
      {
        header: "Region / Division",
        cell: (r) => (
          <div className="text-xs text-slate-700">
            <div>{r.region || "—"}</div>
            {r.division && (
              <div className="text-[11px] text-slate-500 uppercase">
                {r.division}
              </div>
            )}
          </div>
        ),
        className: "w-32",
      },
      {
        header: "Profession",
        cell: (r) => (
          <span className="text-xs text-slate-800 font-medium">
            {r.profession || "—"}
          </span>
        ),
        className: "w-28",
      },
      {
        header: "Account / BP",
        cell: (r) => (
          <div className="text-xs text-slate-700 space-y-0.5">
            <div>{r.accountName || "—"}</div>
            {r.bhBp && (
              <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                {r.bhBp}
              </span>
            )}
          </div>
        ),
        className: "min-w-36",
      },
      {
        header: "Created At",
        cell: (r) => {
          const val = r.createdAt;
          return (
            <span className="text-xs text-slate-600 font-mono whitespace-nowrap">
              {val || "—"}
            </span>
          );
        },
        className: "w-36",
      },
    ],
    [page, pageSize]
  );

  return (
    <ReportPageLayout
      title="Request Training"
      breadcrumbTitle="Request Training"
      showEmailSection={false}
      fields={["dateRange"]}
      exportPermission={[
        "request-training.export",
        "reports.export",
        "reports.read",
        "audit.read",
        "system.all",
      ]}
      autoFetchOnMount={true}
      onViewReport={async (filters) => {
        await fetchReport(filters, true);
      }}
      onGenerate={async (filters) => {
        return exportRequestTrainingAction({
          from: filters.startDate || "",
          to: filters.endDate || "",
        });
      }}
    >
      <div className="space-y-4">
        {hasLoaded && (
          <DataTable
            title="Request Training Records"
            columns={columns}
            data={pagedRows}
            getRowId={(r, idx) =>
              r._rowId || (r.id ? `req-train-${r.id}-${idx}` : `req-train-${idx}`)
            }
            emptyMessage={
              rows.length === 0
                ? "No records found"
                : `No records matching "${search}"`
            }
            headerRight={
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search request training..."
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
