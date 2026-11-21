"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Key } from "lucide-react";

import { DataTable } from '@/components/common/data-table';
import type { Column } from '@/components/common/data-table';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
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
import { deleteRoleAction } from "@/features/roles/action";
import type { RoleItem, RolePageResponse } from "@/features/roles/types";

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
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can("roles.create") || can("system.all");
  const canUpdate = can("roles.update") || can("system.all");
  const canDelete = can("roles.delete") || can("system.all");
  const canViewPermissions = can("roles.read") || can("system.all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setActiveSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: pageData = EMPTY_PAGE, isLoading, refetch } = useQuery({
    queryKey: queryKeys.roles.list({ page, size: pageSize, search: activeSearch }),
    queryFn: ({ signal }) =>
      portalGet<RolePageResponse>(
        "roles",
        { page, size: pageSize, search: activeSearch },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const loadRoles = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    void refetch().then((result) => {
      if (result.error) {
        toastError(result.error.message || "Failed to load roles");
      } else if (showSuccessToast) {
        success("Roles refreshed successfully");
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  };

  const columns: Array<Column<RoleItem>> = useMemo(() => {
    const cols: Array<Column<RoleItem>> = [
      {
        header: "#",
        cell: (r: RoleItem, index?: number) => (
          <span className="font-mono text-xs text-slate-500">
            {(page - 1) * pageSize + (index ?? 0) + 1}
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
              <p className="text-[11px] text-slate-500 font-mono">{r.code}</p>
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
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
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
  }, [canViewPermissions, canUpdate, canDelete, page, pageSize, toastError]);

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
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search roles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 w-44 pl-8 pr-14 text-xs sm:w-56"
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
                loadRoles(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add New Role */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
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
          pageSize,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
          onPageChange: handlePageChange,
        }}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete role{" "}
              <strong className="text-slate-900 font-semibold">
                {roleToDelete?.name}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!roleToDelete) {return;}
                setIsDeleting(true);
                const res = await deleteRoleAction(roleToDelete.id);
                setIsDeleting(false);
                if (res.success) {
                  success(res.message || "Role deleted successfully");
                  setRoleToDelete(null);
                  loadRoles(page, activeSearch);
                } else {
                  toastError(res.error || "Failed to delete role");
                }
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
