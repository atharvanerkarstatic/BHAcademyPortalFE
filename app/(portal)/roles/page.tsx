"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, RefreshCw, Search, ShieldCheck, Key } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getRolesAction } from "@/features/roles/action";
import type { RoleItem, RolePageResponse } from "@/features/roles/types";

export default function RolesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<RolePageResponse>({
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

  const canCreate = can("roles.create") || can("system.all");
  const canUpdate = can("roles.update") || can("system.all");
  const canDelete = can("roles.delete") || can("system.all");

  const loadRoles = (
    targetPage = page,
    searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    startTransition(async () => {
      const res = await getRolesAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
        sort: "name,asc",
      });

      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Roles refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load roles");
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
    loadRoles(page, activeSearch);
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

  const columns: Column<RoleItem>[] = useMemo(() => {
    const cols: Column<RoleItem>[] = [
      {
        header: "Role ID",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {r.id}
          </span>
        ),
        className: "w-20 text-center",
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
      {
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
      },
      {
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
      },
      {
        header: "Delete",
        cell: (r) => (
          <button
            type="button"
            onClick={() => {
              toastError("Role deletion is not permitted for system roles.");
            }}
            className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline"
          >
            Delete
          </button>
        ),
        className: "w-20 text-center",
      },
    ];

    return cols;
  }, [toastError]);

  return (
    <>
      <PageHeader
        title="Manage Roles"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles" },
        ]}
      />

      <div className="flex border-b border-slate-200 mb-4 gap-4">
        <button
          type="button"
          className="pb-2.5 px-3 text-sm font-semibold border-b-2 text-blue-600 border-blue-600 flex items-center gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          Roles List
        </button>
      </div>

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
    </>
  );
}

