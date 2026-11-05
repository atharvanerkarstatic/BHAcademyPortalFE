"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, RefreshCw, Pencil, Trash2, Search, Image as ImageIcon } from "lucide-react";

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
import { useAuth } from "@/lib/auth-context";
import { getCategoriesAction, deleteCategoryAction } from "@/features/categories/action";
import type { CategoryItem, CategoryPageResponse } from "@/features/categories/types";

export default function CategoriesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState("");

  // Reset search filter whenever navigating away or returning to this route
  useEffect(() => {
    return () => {
      setSearchInput("");
      setPage(1);
    };
  }, [pathname]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [pageData, setPageData] = useState<CategoryPageResponse>({
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
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission flags
  const canCreate = can("categories.create");
  const canUpdate = can("categories.update");
  const canDelete = can("categories.delete");

  const loadCategories = (targetPage = page, showSuccessToast = false) => {
    startTransition(async () => {
      const res = await getCategoriesAction({
        page: targetPage,
        size: pageSize,
        sort: "asc",
      });
      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Categories refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load categories");
      }
    });
  };

  useEffect(() => {
    loadCategories(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchClear = () => {
    setSearchInput("");
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    const res = await deleteCategoryAction(String(categoryToDelete.categoryId));
    setIsDeleting(false);
    setCategoryToDelete(null);

    if (res.success) {
      success(res.message || "Category deleted successfully");
      loadCategories(page);
    } else {
      toastError(res.error || "Failed to delete category");
    }
  };

  // Real-time live search filtering (matching FAQ behavior: filters immediately without hitting Enter)
  const filteredData = useMemo(() => {
    if (!searchInput.trim()) return pageData.content;
    const query = searchInput.trim().toLowerCase();
    return pageData.content.filter(
      (item) =>
        Boolean(item.category && item.category.toLowerCase().includes(query)) ||
        (item.categoryId !== undefined && item.categoryId !== null && String(item.categoryId).toLowerCase().includes(query)) ||
        Boolean(item.categoryHi && item.categoryHi.toLowerCase().includes(query))
    );
  }, [pageData.content, searchInput]);

  const columns: Column<CategoryItem>[] = useMemo(() => {
    const cols: Column<CategoryItem>[] = [
      {
        header: "ID",
        cell: (r) => <span className="font-mono text-xs font-semibold">{r.categoryId}</span>,
        className: "w-24",
      },
      {
        header: "Image",
        cell: (r) => {
          const validImg = r.imageUrl && r.imageUrl.startsWith("http");
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
              {validImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.imageUrl}
                  alt={r.category}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-slate-400" />
              )}
            </div>
          );
        },
        className: "w-16",
      },
      {
        header: "Category Name",
        cell: (r) => (
          <div>
            <p className="font-medium text-slate-900">{r.category}</p>
            {r.categoryHi && <span className="text-xs text-slate-400">{r.categoryHi}</span>}
          </div>
        ),
      },
      {
        header: "Display Order",
        cell: (r) => r.displayOrder ?? "—",
        className: "w-32 text-center",
      },
      {
        header: "Featured",
        cell: (r) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              r.featured
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-slate-50 text-slate-500 border border-slate-200"
            }`}
          >
            {r.featured ? "Yes" : "No"}
          </span>
        ),
        className: "w-28 text-center",
      },
      {
        header: "Status",
        cell: (r) => <StatusText active={r.status === "ACTIVE"} />,
        className: "w-28",
      },
      {
        header: "Translations",
        cell: (r) => (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {r.categoryHi && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">HI</span>}
            {r.categoryBn && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">BN</span>}
            {r.categoryKn && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">KN</span>}
            {r.categoryMl && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">ML</span>}
            {r.categoryMr && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">MR</span>}
            {r.categoryOr && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">OR</span>}
            {r.categoryTa && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">TA</span>}
            {r.categoryTe && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">TE</span>}
            {r.categoryAs && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">AS</span>}
            {r.categoryGu && <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">GU</span>}
          </div>
        ),
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center gap-1">
            {canUpdate && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Link href={`/categories/${r.categoryId}/edit`} title="Edit Category">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setCategoryToDelete(r)}
                title="Delete Category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        className: "w-24 text-right",
      });
    }

    return cols;
  }, [canUpdate, canDelete]);

  return (
    <>
      <PageHeader
        title="Manage Categories"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Categories List" }]}
      />

      <DataTable
        title="Categories List"
        logoSrc="/logo.png"
        columns={columns}
        data={filteredData}
        loading={isPending}
        headerRight={
          <div className="flex items-center gap-3">
            {/* Search Input beside Refresh */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search categories..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 w-44 pl-8 pr-14 text-xs sm:w-56"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadCategories(1, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add Category button visible only if user has categories.create permission */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/categories/new">
                  <Plus className="h-4 w-4" />
                  Add Category
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category{" "}
              <strong className="text-slate-900">{categoryToDelete?.category}</strong> (ID:{" "}
              {categoryToDelete?.categoryId})?
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
