"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, RefreshCw, Pencil, Trash2, Search } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { getLanguagesAction, deleteLanguageAction } from "@/features/languages/action";
import type { LanguageItem, LanguagePageResponse } from "@/features/languages/types";

export default function LanguagesPage() {
  const { success, error: toastError } = useToast();
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  // Reset search filter whenever navigating away or returning to this route
  useEffect(() => {
    return () => {
      setSearch("");
      setPage(1);
    };
  }, [pathname]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<LanguagePageResponse>({
    content: [],
    page: 1,
    size: pageSize,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  });

  const [isPending, startTransition] = useTransition();

  // Delete modal state
  const [languageToDelete, setLanguageToDelete] = useState<LanguageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadLanguages = (targetPage = page, showSuccessToast = false) => {
    startTransition(async () => {
      const res = await getLanguagesAction({
        page: targetPage,
        size: pageSize,
      });
      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Languages refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load languages");
      }
    });
  };

  useEffect(() => {
    loadLanguages(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const confirmDelete = async () => {
    if (!languageToDelete) return;
    setIsDeleting(true);

    const res = await deleteLanguageAction(languageToDelete.languageId);
    setIsDeleting(false);
    setLanguageToDelete(null);

    if (res.success) {
      success(res.message || "Language deleted successfully");
      loadLanguages(page);
    } else {
      toastError(res.error || "Failed to delete language");
    }
  };

  // Live client-side search filtering on current fetched items (same as FAQ page)
  const filteredData = useMemo(() => {
    if (!search.trim()) return pageData.content;
    const query = search.toLowerCase();
    return pageData.content.filter(
      (item) =>
        (item.language && item.language.toLowerCase().includes(query)) ||
        (item.languageCode && item.languageCode.toLowerCase().includes(query)) ||
        (item.nativeName && item.nativeName.toLowerCase().includes(query)) ||
        String(item.languageId).includes(query)
    );
  }, [pageData.content, search]);

  const columns: Column<LanguageItem>[] = useMemo(() => {
    return [
      {
        header: "Language ID",
        cell: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.languageId}</span>,
        className: "w-28",
      },
      {
        header: "Language",
        cell: (r) => (
          <div>
            <p className="font-medium text-slate-900">{r.language}</p>
            {r.nativeName && <span className="text-xs text-slate-500">{r.nativeName}</span>}
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
        header: "Native Name",
        cell: (r) => r.nativeName || "-",
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
          <div className="flex items-center gap-1.5 justify-end">
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
              onClick={() => setLanguageToDelete(r)}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              title="Delete Language"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        className: "w-24 text-right",
      },
    ];
  }, []);

  return (
    <>
      <PageHeader
        title="Manage Languages"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Languages" }]}
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
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search languages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add Language button */}
            <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
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
      <AlertDialog
        open={Boolean(languageToDelete)}
        onOpenChange={(open) => !open && setLanguageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Language?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this language ({languageToDelete?.languageId})?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">
                {languageToDelete?.language} {languageToDelete?.nativeName ? `(${languageToDelete.nativeName})` : ""}
              </strong>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
