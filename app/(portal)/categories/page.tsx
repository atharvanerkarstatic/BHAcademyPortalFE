"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteCategoryAction } from "@/features/categories/action";
import type {
  CategoryItem,
  CategoryPageResponse,
} from "@/features/categories/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

const EMPTY_PAGE: CategoryPageResponse = {
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

export default function CategoriesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(
    null
  );

  const canCreate = can("categories.create");
  const canUpdate = can("categories.update");
  const canDelete = can("categories.delete");

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.categories.list({
      page,
      size: PAGE_SIZE,
      sort: "asc",
      status: null,
    }),
    queryFn: ({ signal }) =>
      portalGet<CategoryPageResponse>(
        "categories",
        { page, size: PAGE_SIZE, sort: "asc" },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategoryAction(id),
    onSuccess: async (res) => {
      setCategoryToDelete(null);
      if (res.success) {
        success(res.message || "Category deleted successfully");
        await queryClient.invalidateQueries({
          queryKey: queryKeys.categories.all,
        });
      } else {
        toastError(res.error || "Failed to delete category");
      }
    },
    onError: () => {
      setCategoryToDelete(null);
      toastError("Failed to delete category");
    },
  });

  const handleRefresh = async () => {
    setPage(1);
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load categories");
    } else {
      success("Categories refreshed successfully");
    }
  };

  const filteredData = useMemo(() => {
    if (!searchInput.trim()) {
      return pageData.content;
    }
    const query = searchInput.trim().toLowerCase();
    return pageData.content.filter(
      (item) =>
        Boolean(item.category && item.category.toLowerCase().includes(query)) ||
        (item.categoryId !== undefined &&
          item.categoryId !== null &&
          String(item.categoryId).toLowerCase().includes(query)) ||
        Boolean(
          item.categoryHi && item.categoryHi.toLowerCase().includes(query)
        )
    );
  }, [pageData.content, searchInput]);

  const columns: Array<Column<CategoryItem>> = useMemo(() => {
    const cols: Array<Column<CategoryItem>> = [
      {
        header: "ID",
        cell: (row) => (
          <span className="font-mono text-xs font-semibold">
            {row.categoryId}
          </span>
        ),
        className: "w-24",
      },
      {
        header: "Image",
        cell: (row) => {
          const validImg = row.imageUrl && row.imageUrl.startsWith("http");
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
              {validImg ? (
                <img
                  src={row.imageUrl}
                  alt={row.category}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    if (event.currentTarget instanceof HTMLElement) {
                      event.currentTarget.style.display = "none";
                    }
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
        cell: (row) => (
          <div>
            <p className="font-medium text-slate-900">{row.category}</p>
            {row.categoryHi ? (
              <span className="text-xs text-slate-400">{row.categoryHi}</span>
            ) : null}
          </div>
        ),
      },
      {
        header: "Display Order",
        cell: (row) => row.displayOrder ?? "—",
        className: "w-32 text-center",
      },
      {
        header: "Featured",
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              row.featured
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : "border border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {row.featured ? "Yes" : "No"}
          </span>
        ),
        className: "w-28 text-center",
      },
      {
        header: "Status",
        cell: (row) => <StatusText active={row.status === "ACTIVE"} />,
        className: "w-28",
      },
      {
        header: "Category Courses",
        cell: (row) => (
          <Link
            href={`/courses?category=${encodeURIComponent(String(row.categoryId))}`}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View Courses ({row.courseCount ?? 0})
          </Link>
        ),
        className: "w-36",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (row) => (
          <div className="flex items-center gap-1">
            {canUpdate ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Link
                  href={`/categories/${row.categoryId}/edit`}
                  title="Edit Category"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setCategoryToDelete(row);
                }}
                title="Delete Category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
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
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Categories List" },
        ]}
      />

      <DataTable
        title="Categories List"
        logoSrc="/logo.png"
        columns={columns}
        data={filteredData}
        getRowId={(row) => row.categoryId}
        loading={isLoading}
        headerRight={
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search categories..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                className="h-8 w-44 pr-14 pl-8 text-xs sm:w-56"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                  }}
                  className="absolute right-3 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isFetching}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canCreate ? (
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Link href="/categories/new">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Link>
              </Button>
            ) : null}
          </div>
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
          onPageChange: setPage,
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
        title="Delete Category?"
        description={
          <>
            Are you sure you want to delete category{" "}
            <strong className="text-slate-900">
              {categoryToDelete?.category}
            </strong>{" "}
            (ID: {categoryToDelete?.categoryId})?
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={() => {
          if (categoryToDelete) {
            deleteMutation.mutate(String(categoryToDelete.categoryId));
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
