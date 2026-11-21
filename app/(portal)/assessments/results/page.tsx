"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type {
  AssessmentResultItem,
  AssessmentResultPageResponse,
} from "@/features/assessments/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 10;

const EMPTY_PAGE = {
  content: [] as Array<AssessmentResultItem>,
  totalElements: 0,
  totalPages: 0,
};

export default function AssessmentResultsPage() {
  const { success, error: toastError } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const activeSearch = useDebouncedValue(searchInput.trim(), 350);
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const {
    data: queryData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.assessments.results({
      page,
      size: pageSize,
      search: activeSearch,
    }),
    queryFn: ({ signal }) =>
      portalGet<AssessmentResultPageResponse>(
        "assessments/results",
        { page, size: pageSize, search: activeSearch },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const pageData = queryData
    ? {
        content: queryData.content || [],
        totalElements: queryData.totalElements || 0,
        totalPages: queryData.totalPages || 0,
      }
    : EMPTY_PAGE;

  const isPending = isLoading;

  const refreshAssessmentResults = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load assessment results");
    } else if (showSuccessToast) {
      success("Assessment results refreshed successfully");
    }
  };

  const loadAssessmentResults = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void refreshAssessmentResults(showSuccessToast);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setPage(1);
  };

  const columns: Array<Column<AssessmentResultItem>> = useMemo(() => {
    const cols: Array<Column<AssessmentResultItem>> = [
      {
        header: "ID",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {r.id}
          </span>
        ),
        className: "w-16 text-center",
      },
      {
        header: "Participant",
        cell: (r) => (
          <span className="leading-snug font-medium text-slate-900">
            {r.user || "—"}
          </span>
        ),
      },
      {
        header: "Course",
        cell: (r) => (
          <span className="font-medium text-slate-800">{r.course || "—"}</span>
        ),
      },
      {
        header: "Language",
        cell: (r) => (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {r.language || "—"}
          </span>
        ),
      },
      {
        header: "Mode",
        cell: (r) => (
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 capitalize">
            {r.modeOfTraining || "—"}
          </span>
        ),
      },
      {
        header: "Trainer",
        cell: (r) => (
          <span className="text-xs text-slate-700">{r.trainer || "—"}</span>
        ),
      },
      {
        header: "Result",
        cell: (r) => {
          const raw = (r.result || "").trim().toUpperCase();
          const isPass =
            raw === "ACTIVE" ||
            raw === "PASS" ||
            raw === "PASSED" ||
            raw === "SUCCESS" ||
            raw === "COMPLETED";
          const isFail =
            raw === "INACTIVE" || raw === "FAIL" || raw === "FAILED";

          // Strictly display Passed / Failed (never Active / Inactive)
          let displayLabel = r.result || "—";
          if (isPass) {
            displayLabel = "Passed";
          } else if (isFail) {
            displayLabel = "Failed";
          }

          let badgeClass = "border-slate-200 bg-slate-100 text-slate-700";
          if (isPass) {
            badgeClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
          } else if (isFail) {
            badgeClass = "border-rose-200 bg-rose-50 text-rose-700";
          }

          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
            >
              {isPass && <CheckCircle2 className="h-3 w-3" />}
              {isFail && <XCircle className="h-3 w-3" />}
              {displayLabel}
            </span>
          );
        },
        className: "w-28 text-center",
      },
      {
        header: "Date",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-600">
            {r.date || "—"}
          </span>
        ),
      },
    ];

    return cols;
  }, []);

  return (
    <>
      <PageHeader
        title="Manage Assessment Results"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Assessment Results" },
        ]}
      />

      <DataTable
        title="Assessment Results List"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={
          activeSearch
            ? `No assessment results matching "${activeSearch}"`
            : "No assessment results found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh matching Courses list */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center"
            >
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search participant, course, trainer..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-44 pr-14 pl-8 text-xs sm:w-64"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-2 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="hidden"
              >
                Search
              </Button>
            </form>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadAssessmentResults(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Assessment Summary button */}
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link href="/reports/assessment-summary">
                <BarChart3 className="h-4 w-4" />
                Assessment Summary
              </Link>
            </Button>
          </div>
        }
        pagination={{
          page,
          pageSize,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
          onPageChange: handlePageChange,
        }}
      />
    </>
  );
}
