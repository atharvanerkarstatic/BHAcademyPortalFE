"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Pencil,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useMemo } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  deleteTrainerAction,
  exportTrainersAction,
  updateTrainerStatusAction,
} from "@/features/trainers/action";
import type {
  TrainerItem,
  TrainerPageResponse,
} from "@/features/trainers/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import { downloadCsv } from "@/lib/download";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const EMPTY_PAGE: TrainerPageResponse = {
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

export default function TrainersPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const activeSearch = useDebouncedValue(searchInput.trim(), 350);
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const [isExporting, setIsExporting] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState<TrainerItem | null>(
    null
  );
  const [togglingTrainerId, setTogglingTrainerId] = useState<number | null>(
    null
  );

  const canCreate = can("users.create") || can("system.all");
  const canUpdate = can("users.update") || can("system.all");
  const canDelete = can("users.delete") || can("system.all");
  const canExport = can("users.read") || can("system.all");

  const listKey = queryKeys.trainers.list({
    page,
    size: pageSize,
    search: activeSearch,
  });

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) =>
      portalGet<TrainerPageResponse>(
        "trainers",
        { page, size: pageSize, search: activeSearch },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const toggleMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) =>
      updateTrainerStatusAction(id, nextStatus),
    onMutate: async ({ id, nextStatus }) => {
      setTogglingTrainerId(id);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<TrainerPageResponse>(listKey);
      queryClient.setQueryData<TrainerPageResponse>(listKey, (prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((item) =>
                item.id === id ? { ...item, status: nextStatus } : item
              ),
            }
          : prev
      );
      return { previous };
    },
    onSuccess: (res, { nextStatus }, context) => {
      if (res.success) {
        success(
          res.message ||
            `Trainer status updated to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}`
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.all,
        });
      } else {
        if (context?.previous) {
          queryClient.setQueryData(listKey, context.previous);
        }
        toastError(res.error || "Failed to update trainer status");
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toastError("An error occurred while updating trainer status");
    },
    onSettled: () => {
      setTogglingTrainerId(null);
    },
  });

  const handleToggleStatus = useCallback(
    (trainer: TrainerItem) => {
      if (!canUpdate) {
        return;
      }
      const nextStatus = trainer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      toggleMutation.mutate({ id: trainer.id, nextStatus });
    },
    [canUpdate, toggleMutation]
  );

  const refreshTrainers = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load trainers");
    } else if (showSuccessToast) {
      success("Trainers refreshed successfully");
    }
  };

  const loadTrainers = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void refreshTrainers(showSuccessToast);
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTrainerAction(id),
    onSuccess: async (res) => {
      setTrainerToDelete(null);
      if (res.success) {
        success(res.message || "Trainer deleted successfully");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.trainers.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        ]);
      } else {
        toastError(res.error || "Failed to delete trainer");
      }
    },
    onError: () => {
      setTrainerToDelete(null);
      toastError("Failed to delete trainer");
    },
  });

  const isDeleting = deleteMutation.isPending;

  const confirmDelete = () => {
    if (!trainerToDelete) {
      return;
    }
    deleteMutation.mutate(trainerToDelete.id);
  };

  const handleDownloadTrainers = async () => {
    setIsExporting(true);
    try {
      const res = await exportTrainersAction();
      if (res.success && res.data) {
        downloadCsv(res.data, res.filename || "trainers_export.csv");
        success(res.message || "Trainers CSV downloaded successfully");
      } else {
        toastError(res.error || "Failed to download trainers CSV");
      }
    } catch (error) {
      console.error("Export error:", error);
      toastError("Failed to export trainers.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Array<Column<TrainerItem>> = useMemo(() => {
    const cols: Array<Column<TrainerItem>> = [
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
        header: "Profile",
        cell: (r) => {
          const validImg = r.profilePic && r.profilePic.startsWith("http");
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {validImg ? (
                <img
                  src={r.profilePic}
                  alt={r.firstName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
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
            <div className="font-semibold text-slate-900">
              {fullName || "—"}
            </div>
          );
        },
      },
      {
        header: "Email",
        cell: (r) => (
          <span className="text-xs text-slate-600">{r.email || "—"}</span>
        ),
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
        header: "Pincode",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-700">
            {r.pincode || r.pinCode || "—"}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (r) => {
          const isActive = r.status === "ACTIVE";
          const isToggling = togglingTrainerId === r.id;

          if (!canUpdate) {
            return <StatusText active={isActive} />;
          }

          return (
            <button
              type="button"
              disabled={isToggling}
              onClick={() => {
                handleToggleStatus(r);
              }}
              title={`Click to toggle status (${isActive ? "Suspend / Inactivate" : "Activate"})`}
              className={cn(
                "group relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs transition-all",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
                isToggling && "cursor-not-allowed opacity-60"
              )}
            >
              {isToggling ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-transform group-hover:scale-125",
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
          const date = r.createdAt
            ? new Date(r.createdAt).toLocaleDateString()
            : "—";
          return <span className="text-xs text-slate-500">{date}</span>;
        },
        className: "w-28 text-center",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Manage",
        cell: (r) => (
          <div className="flex items-center justify-end gap-1.5">
            {canUpdate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                asChild
                title="Edit Trainer"
              >
                <Link href={`/trainers/${r.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  setTrainerToDelete(r);
                }}
                title="Delete Trainer"
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
  }, [canUpdate, canDelete, togglingTrainerId, handleToggleStatus]);

  return (
    <>
      <PageHeader
        title="Manage Trainers"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainers" },
        ]}
      />

      <DataTable
        title="Trainers List"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={
          activeSearch
            ? `No trainers matching "${activeSearch}"`
            : "No trainers found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center"
            >
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search trainers..."
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
                  className="absolute right-8 text-[11px] text-slate-400 hover:text-slate-600"
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
                loadTrainers(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Download Trainers button */}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleDownloadTrainers();
                }}
                disabled={isExporting}
                className="gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Download
                  className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`}
                />
                <span>
                  {isExporting ? "Downloading…" : "Download Trainers"}
                </span>
              </Button>
            )}

            {/* Add Trainer button */}
            {canCreate && (
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Link href="/trainers/new">
                  <Plus className="h-4 w-4" />
                  Add Trainer
                </Link>
              </Button>
            )}
          </div>
        }
        pagination={{
          page: pageData.page || page,
          pageSize,
          totalPages: pageData.totalPages || 1,
          totalElements: pageData.totalElements || 0,
          onPageChange: handlePageChange,
        }}
      />

      {/* Delete Confirmation Alert Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(trainerToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setTrainerToDelete(null);
          }
        }}
        title="Delete Trainer"
        description={
          <>
            Are you sure you want to delete trainer{" "}
            <strong className="font-semibold text-slate-800">
              {[trainerToDelete?.firstName, trainerToDelete?.lastName]
                .filter(Boolean)
                .join(" ")}
            </strong>
            ? This action cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        confirmLabel="Delete"
        deletingLabel="Deleting..."
      />
    </>
  );
}
