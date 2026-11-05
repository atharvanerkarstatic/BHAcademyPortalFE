"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, RefreshCw, Search } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getAssessmentLinksAction } from "@/features/assessments/action";
import type { AssessmentLinkItem } from "@/features/assessments/types";

export default function AssessmentLinksPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<{
    content: AssessmentLinkItem[];
    totalElements: number;
    totalPages: number;
  }>({
    content: [],
    totalElements: 0,
    totalPages: 0,
  });

  const [isPending, startTransition] = useTransition();

  const canCreate = can("courses.create") || can("courses.read");

  const loadAssessmentLinks = (
    targetPage = page,
    searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    startTransition(async () => {
      const res = await getAssessmentLinksAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
      });

      if (res.success && res.data) {
        setPageData({
          content: res.data.content || [],
          totalElements: res.data.totalElements || 0,
          totalPages: res.data.totalPages || 0,
        });
        if (showSuccessToast) {
          success("Assessment links refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load assessment links");
      }
    });
  };

  // Reset search filter whenever navigating away or returning to this route
  useEffect(() => {
    return () => {
      setSearchInput("");
      setActiveSearch("");
      setPage(1);
    };
  }, [pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setActiveSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadAssessmentLinks(page, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeSearch]);

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

  const columns: Column<AssessmentLinkItem>[] = useMemo(() => {
    const cols: Column<AssessmentLinkItem>[] = [
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
          if (!r.linkId) return <span className="text-xs text-slate-400">—</span>;
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
