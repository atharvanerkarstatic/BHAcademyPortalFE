"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, RefreshCw, Search, UserRound, Pencil, Trash2, Loader2 } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
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
import { cn } from "@/lib/utils";
import {
  getAdminUsersAction,
  deleteAdminUserAction,
  updateAdminUserStatusAction,
} from "@/features/admin-users/action";
import type { AdminUserItem, AdminUserPageResponse } from "@/features/admin-users/types";

export default function AdminUsersPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<AdminUserPageResponse>({
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
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  const canCreate = can("users.create") || can("system.all");
  const canUpdate = can("users.update") || can("system.all");
  const canDelete = can("users.delete") || can("system.all");

  const handleToggleStatus = async (user: AdminUserItem) => {
    if (!canUpdate) return;
    const currentActive = user.status === "ACTIVE";
    const nextStatus = currentActive ? "SUSPENDED" : "ACTIVE";

    // Optimistically update the UI
    setTogglingUserId(user.id);
    setPageData((prev) => ({
      ...prev,
      content: prev.content.map((item) =>
        item.id === user.id ? { ...item, status: nextStatus } : item
      ),
    }));

    try {
      const res = await updateAdminUserStatusAction(user.id, nextStatus);
      if (res.success) {
        success(res.message || `User status updated to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}`);
      } else {
        // Revert on failure
        setPageData((prev) => ({
          ...prev,
          content: prev.content.map((item) =>
            item.id === user.id ? { ...item, status: user.status } : item
          ),
        }));
        toastError(res.error || "Failed to update user status");
      }
    } catch {
      // Revert on error
      setPageData((prev) => ({
        ...prev,
        content: prev.content.map((item) =>
          item.id === user.id ? { ...item, status: user.status } : item
        ),
      }));
      toastError("An error occurred while updating user status");
    } finally {
      setTogglingUserId(null);
    }
  };

  const loadUsers = (
    targetPage = page,
    searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    startTransition(async () => {
      const res = await getAdminUsersAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
      });

      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success(res.message || "Users refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load users");
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
    loadUsers(page, activeSearch);
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

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    const res = await deleteAdminUserAction(userToDelete.id);
    setIsDeleting(false);
    setUserToDelete(null);

    if (res.success) {
      success(res.message || "User archived successfully");
      loadUsers(page, activeSearch);
    } else {
      toastError(res.error || "Failed to delete user");
    }
  };

  const columns: Column<AdminUserItem>[] = useMemo(() => {
    const cols: Column<AdminUserItem>[] = [
      {
        header: "ID",
        cell: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.id}</span>,
        className: "w-16 text-center",
      },
      {
        header: "Profile",
        cell: (r) => {
          const validImg = r.profilePic && r.profilePic.startsWith("http");
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {validImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.profilePic || ""}
                  alt={r.firstName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <UserRound className="h-5 w-5 text-slate-400" />
              )}
            </div>
          );
        },
        className: "w-16 text-center",
      },
      {
        header: "Name",
        cell: (r) => {
          const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
          return (
            <div className="font-semibold text-slate-900 leading-snug">
              {fullName || "—"}
            </div>
          );
        },
      },
      {
        header: "Email",
        cell: (r) => <span className="text-xs text-slate-600">{r.email || "—"}</span>,
      },
      {
        header: "Roles",
        cell: (r) => {
          const roleNames =
            r.roles && r.roles.length > 0
              ? r.roles.map((role) => role.name || role.code).join(", ")
              : r.roleCodes && r.roleCodes.length > 0
              ? r.roleCodes.join(", ")
              : "—";
          return (
            <span className="inline-block max-w-[200px] truncate text-xs font-medium text-slate-700">
              {roleNames}
            </span>
          );
        },
      },
      {
        header: "Mobile Number",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-700">
            {r.mobileNumber || "—"}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (r) => {
          const isActive = r.status === "ACTIVE";
          const isToggling = togglingUserId === r.id;

          if (!canUpdate) {
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs border",
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    isActive ? "bg-emerald-500" : "bg-rose-500"
                  )}
                />
                <span>{isActive ? "Active" : "Inactive"}</span>
              </span>
            );
          }

          return (
            <button
              type="button"
              disabled={isToggling}
              onClick={() => handleToggleStatus(r)}
              title={`Click to toggle status (${isActive ? "Suspend / Inactivate" : "Activate"})`}
              className={cn(
                "group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all shadow-xs border",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300",
                isToggling && "opacity-60 cursor-not-allowed"
              )}
            >
              {isToggling ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125",
                    isActive ? "bg-emerald-500" : "bg-rose-500"
                  )}
                />
              )}
              <span>{isActive ? "Active" : "Inactive"}</span>
            </button>
          );
        },
        className: "w-28 text-center",
      },
      {
        header: "Created Date",
        cell: (r) => {
          const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—";
          return <span className="text-xs text-slate-500">{date}</span>;
        },
        className: "w-28 text-center",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center justify-end gap-1.5">
            {canUpdate && (
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                title="Edit User"
              >
                <Link href={`/admin-users/${r.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setUserToDelete(r)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete User"
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
  }, [canUpdate, canDelete, togglingUserId]);

  return (
    <>
      <PageHeader
        title="Admin Users"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin Users" },
        ]}
      />

      <DataTable
        title="Admin Users List"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={activeSearch ? `No users matching "${activeSearch}"` : "No admin users found"}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 w-44 pl-8 pr-14 text-xs sm:w-56"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-8 text-[11px] text-slate-400 hover:text-slate-600"
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
                loadUsers(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add User button */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/admin-users/new">
                  <Plus className="h-4 w-4" />
                  Add User
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

      {/* Delete / Archive Confirmation Dialog */}
      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete/archive user (ID: {userToDelete?.id}) (
              {userToDelete?.firstName} {userToDelete?.lastName})?
              <br />
              This action will disable the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isDeleting ? "Archiving..." : "Yes, Archive User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
