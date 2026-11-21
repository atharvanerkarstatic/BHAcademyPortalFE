"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";

import { DataTable } from '@/components/common/data-table';
import type { Column } from '@/components/common/data-table';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import type { AssessmentLinkItem, AssessmentLinkPageResponse } from "@/features/assessments/types";

const PAGE_SIZE = 10;

const EMPTY_PAGE = {
  content: [] as Array<AssessmentLinkItem>,
  totalElements: 0,
  totalPages: 0,
};

export default function AssessmentLinksPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const canCreate = can("courses.create") || can("courses.read");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setActiveSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.assessments.links({ page, size: pageSize, search: activeSearch }),
    queryFn: ({ signal }) =>
      portalGet<AssessmentLinkPageResponse>(
        "assessments/links",
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

  const loadAssessmentLinks = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void refetch().then((result) => {
      if (result.error) {
        toastError(result.error.message || "Failed to load assessment links");
      } else if (showSuccessToast) {
        success("Assessment links refreshed successfully");
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setPage(1);
    setActiveSearch("");
  };

  const columns: Array<Column<AssessmentLinkItem>> = useMemo(() => {
    const cols: Array<Column<AssessmentLinkItem>> = [
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
        header: "Course",
        cell: (r) => (
          <span className="font-medium text-slate-900 leading-snug">
            {r.course || "—"}
          </span>
        ),
      },
      {
        header: "Language",
        cell: (r) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
            {r.language || "—"}
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
        header: "Training Date",
        cell: (r) => (
          <span className="text-xs text-slate-600 font-mono">
            {r.trainingDate || "—"}
          </span>
        ),
      },
      {
        header: "Participant Mobile",
        cell: (r) => (
          <span className="font-mono text-xs font-medium text-slate-800">
            {r.mobile || "—"}
          </span>
        ),
      },
      {
        header: "Link ID",
        cell: (r) => {
          if (!r.linkId) {return <span className="text-xs text-slate-400">—</span>;}
          return (
            <span className="font-mono text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px] inline-block">
              {r.linkId}
            </span>
          );
        },
      },
      {
        header: "Status",
        cell: (r) => {
          const status = (r.linkStatus || "").toUpperCase();
          const isActive = status === "ACTIVE";
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {status || "UNKNOWN"}
            </span>
          );
        },
        className: "w-28 text-center",
      },
    ];

    return cols;
  }, []);

  return (
    <>
      <PageHeader
        title="Manage Assessment Links"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Assessment Links" },
        ]}
      />

      <DataTable
        title="Assessment Links List"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={
          activeSearch
            ? `No assessment links matching "${activeSearch}"`
            : "No assessment links found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh matching Courses list */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search course, trainer, mobile..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 w-44 pl-8 pr-14 text-xs sm:w-64"
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
              <Button type="submit" variant="ghost" size="sm" className="hidden">
                Search
              </Button>
            </form>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadAssessmentLinks(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Send Assessment Link button */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/assessments/send">
                  <Plus className="h-4 w-4" />
                  Send Assessment Link
                </Link>
              </Button>
            )}
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
