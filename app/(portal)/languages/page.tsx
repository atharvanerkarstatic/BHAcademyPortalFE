"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus, RefreshCw, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteLanguageAction } from "@/features/languages/action";
import type {
  LanguageItem,
  LanguagePageResponse,
} from "@/features/languages/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 10;

const EMPTY_PAGE: LanguagePageResponse = {
  content: [],
  page: 1,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

export default function LanguagesPage() {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [languageToDelete, setLanguageToDelete] = useState<LanguageItem | null>(
    null
  );

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.languages.list({ page, size: pageSize }),
    queryFn: ({ signal }) =>
      portalGet<LanguagePageResponse>(
        "languages",
        { page, size: pageSize },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const refreshLanguages = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load languages");
    } else if (showSuccessToast) {
      success("Languages refreshed successfully");
    }
  };

  const loadLanguages = (targetPage = page, showSuccessToast = false) => {
    setPage(targetPage);
    void refreshLanguages(showSuccessToast);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLanguageAction(id),
    onSuccess: async (res) => {
      setLanguageToDelete(null);
      if (res.success) {
        success(res.message || "Language deleted successfully");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.languages.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.allLanguages }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        ]);
      } else {
        toastError(res.error || "Failed to delete language");
      }
    },
    onError: () => {
      setLanguageToDelete(null);
      toastError("Failed to delete language");
    },
  });

  const isDeleting = deleteMutation.isPending;

  const confirmDelete = () => {
    if (!languageToDelete) {
      return;
    }
    deleteMutation.mutate(languageToDelete.languageId);
  };

  // Live client-side search filtering on current fetched items (same as FAQ page)
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return pageData.content;
    }
    const query = search.toLowerCase();
    return pageData.content.filter(
      (item) =>
        (item.language && item.language.toLowerCase().includes(query)) ||
        (item.languageCode &&
          item.languageCode.toLowerCase().includes(query)) ||
        (item.nativeName && item.nativeName.toLowerCase().includes(query)) ||
        item.languageId.includes(query)
    );
  }, [pageData.content, search]);

  const columns: Array<Column<LanguageItem>> = useMemo(
    () => [
      {
        header: "Language ID",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {r.languageId}
          </span>
        ),
        className: "w-28",
      },
      {
        header: "Language",
        cell: (r) => (
          <div>
            <p className="font-medium text-slate-900">{r.language}</p>
            {r.nativeName && (
              <span className="text-xs text-slate-500">{r.nativeName}</span>
            )}
          </div>
        ),
      },
      {
        header: "Language Code",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-600">
            {r.languageCode || "-"}
          </span>
        ),
        className: "w-32",
      },
      {
        header: "Default",
        cell: (r) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              r.isDefault
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {r.isDefault ? "Yes" : "No"}
          </span>
        ),
        className: "w-24 text-center",
      },
      {
        header: "Status",
        cell: (r) => <StatusText active={r.isActive} />,
        className: "w-24",
      },
      {
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              title="Edit Language"
            >
              <Link href={`/languages/${r.languageId}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setLanguageToDelete(r);
              }}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              title="Delete Language"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        className: "w-24 text-right",
      },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Manage Languages"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Languages" },
        ]}
      />

      <DataTable
        title="Languages List"
        logoSrc="/logo.png"
        columns={columns}
        data={filteredData}
        getRowId={(r) => r.languageId}
        loading={isPending}
        emptyMessage="No languages found"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh (same as FAQ page) */}
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search languages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                className="h-8 w-44 pl-8 text-xs sm:w-56"
              />
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadLanguages(1, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add Language button */}
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link href="/languages/new">
                <Plus className="h-4 w-4" />
                Add Language
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(languageToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setLanguageToDelete(null);
          }
        }}
        title="Delete Language?"
        description={
          <>
            Are you sure you want to delete this language (
            {languageToDelete?.languageId})?
            <br />
            <strong className="mt-2 line-clamp-2 text-slate-800">
              {languageToDelete?.language}{" "}
              {languageToDelete?.nativeName
                ? `(${languageToDelete.nativeName})`
                : ""}
            </strong>
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
