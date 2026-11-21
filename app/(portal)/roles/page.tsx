"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus, RefreshCw, Search, Key } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteRoleAction } from "@/features/roles/action";
import type { RoleItem, RolePageResponse } from "@/features/roles/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 10;

const EMPTY_PAGE: RolePageResponse = {
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

export default function RolesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const activeSearch = useDebouncedValue(searchInput.trim(), 350);
  const [page, setPage] = useState(1);

  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can("roles.create") || can("system.all");
  const canUpdate = can("roles.update") || can("system.all");
  const canDelete = can("roles.delete") || can("system.all");
  const canViewPermissions = can("roles.read") || can("system.all");

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.roles.list({
      page,
      size: PAGE_SIZE,
      search: activeSearch,
    }),
    queryFn: ({ signal }) =>
      portalGet<RolePageResponse>(
        "roles",
        { page, size: PAGE_SIZE, search: activeSearch },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const refreshRoles = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load roles");
    } else if (showSuccessToast) {
      success("Roles refreshed successfully");
    }
  };

  const loadRoles = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    void refreshRoles(showSuccessToast);
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

  const columns: Array<Column<RoleItem>> = useMemo(() => {
    const cols: Array<Column<RoleItem>> = [
      {
        header: "#",
        cell: (r: RoleItem, index?: number) => (
          <span className="font-mono text-xs text-slate-500">
            {(page - 1) * PAGE_SIZE + (index ?? 0) + 1}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        header: "Role Name",
        cell: (r) => (
          <div className="space-y-0.5">
            <span className="font-medium text-slate-900">{r.name}</span>
            {r.code && (
              <p className="font-mono text-[11px] text-slate-500">{r.code}</p>
            )}
          </div>
        ),
      },
      {
        header: "Status",
        cell: (r) => {
          const active = r.isActive !== false;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
        className: "w-28 text-center",
      },
    ];

    if (canViewPermissions) {
      cols.push({
        header: "Permissions",
        cell: (r) => (
          <Link
            href={`/roles/${r.id}/permissions`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Key className="h-3.5 w-3.5" />
            Permissions
          </Link>
        ),
        className: "w-32 text-center",
      });
    }

    if (canUpdate) {
      cols.push({
        header: "Edit",
        cell: (r) => (
          <Link
            href={`/roles/${r.id}/edit`}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Edit
          </Link>
        ),
        className: "w-20 text-center",
      });
    }

    if (canDelete) {
      cols.push({
        header: "Delete",
        cell: (r) => (
          <button
            type="button"
            onClick={() => {
              if (r.isSystemRole) {
                toastError("Role deletion is not permitted for system roles.");
                return;
              }
              setRoleToDelete(r);
            }}
            className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline"
          >
            Delete
          </button>
        ),
        className: "w-20 text-center",
      });
    }

    return cols;
  }, [canViewPermissions, canUpdate, canDelete, page, toastError]);

  return (
    <>
      <PageHeader
        title="Manage Roles"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles" },
        ]}
      />

      <DataTable
        title="Roles List"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={
          activeSearch
            ? `No roles matching "${activeSearch}"`
            : "No roles found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input matching courses module style */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center"
            >
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search roles..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-44 pr-14 pl-8 text-xs sm:w-56"
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
                loadRoles(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add New Role */}
            {canCreate && (
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Link href="/roles/new">
                  <Plus className="h-4 w-4" />
                  Add New Role
                </Link>
              </Button>
            )}
          </div>
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
          onPageChange: handlePageChange,
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteDialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setRoleToDelete(null);
          }
        }}
        title="Delete Role?"
        description={
          <>
            Are you sure you want to delete role{" "}
            <strong className="font-semibold text-slate-900">
              {roleToDelete?.name}
            </strong>
            ? This action cannot be undone.
          </>
        }
        onConfirm={async () => {
          if (!roleToDelete) {
            return;
          }
          setIsDeleting(true);
          try {
            const res = await deleteRoleAction(roleToDelete.id);
            if (res.success) {
              success(res.message || "Role deleted successfully");
              setRoleToDelete(null);
              loadRoles(page, activeSearch);
            } else {
              toastError(res.error || "Failed to delete role");
            }
          } catch {
            toastError("Failed to delete role");
          } finally {
            setIsDeleting(false);
          }
        }}
        isDeleting={isDeleting}
        confirmLabel="Delete Role"
        deletingLabel="Deleting..."
      />
    </>
  );
}
