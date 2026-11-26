"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Pencil, Trash2, MapPin, Calendar as CalendarIcon, ExternalLink } from "lucide-react";

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
import {
  getTrainingMastersAction,
  deleteTrainingMasterAction,
} from "@/features/training-master/action";
import type {
  TrainingMasterItem,
  TrainingMasterPageResponse,
} from "@/features/training-master/types";

export default function TrainingMasterPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<TrainingMasterPageResponse>({
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
  const [itemToDelete, setItemToDelete] = useState<TrainingMasterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can(["training-master.create", "users.create", "ROLE_TRAINER", "system.all"]);
  const canUpdate = can(["training-master.update", "users.update", "ROLE_TRAINER", "system.all"]);
  const canDelete = can(["training-master.delete", "users.delete", "ROLE_TRAINER", "system.all"]);

  const loadData = (targetPage = page, searchTerm = activeSearch, showSuccessToast = false) => {
    startTransition(async () => {
      const res = await getTrainingMastersAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
      });

      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Training master records refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load training master records");
      }
    });
  };

  useEffect(() => {
    loadData(page, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    const res = await deleteTrainingMasterAction(itemToDelete.id);
    setIsDeleting(false);
    setItemToDelete(null);

    if (res.success) {
      success(res.message || "Training master deleted successfully");
      loadData(page, activeSearch);
    } else {
      toastError(res.error || "Failed to delete training master");
    }
  };

  const columns: Column<TrainingMasterItem>[] = useMemo(
    () => [
      {
        header: "ID",
        cell: (r) => <span className="font-mono text-xs text-slate-500">{r.id}</span>,
        className: "w-20 font-mono text-xs text-slate-500",
      },
      {
        header: "Training Details",
        cell: (r) => {
          const primaryLang =
            r.languages?.find((l) => l.languageCode === "en") || r.languages?.[0];
          const title = primaryLang?.trainingTitle || r.topicName || r.topic?.topic || "Untitled Training";
          const desc = primaryLang?.trainingDescription || primaryLang?.traingDescription || "";

          return (
            <div className="space-y-1 max-w-sm">
              <span className="font-semibold text-slate-900 block leading-snug">
                {title}
              </span>
              {desc && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {desc}
                </p>
              )}
              {r.topicName && (
                <span className="inline-block text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  Topic: {r.topicName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: "Date",
        cell: (r) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 whitespace-nowrap font-medium">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{r.trainingDate || "—"}</span>
          </div>
        ),
        className: "w-32",
      },
      {
        header: "Location & Pincode",
        cell: (r) => (
          <div className="space-y-0.5 text-xs text-slate-700">
            <div className="flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>
                {[r.city, r.state].filter(Boolean).join(", ") || r.geoLocation || "—"}
              </span>
            </div>
            <div className="text-slate-500 text-[11px] pl-4">
              Pincode: <strong className="font-mono text-slate-700">{r.pincode || "—"}</strong>
              {r.region && ` • ${r.region}`}
              {r.division && ` • ${r.division}`}
            </div>
            {r.googleMapsLink && (
              <a
                href={r.googleMapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline pl-4"
              >
                View Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ),
        className: "w-56",
      },
      {
        header: "Languages",
        cell: (r) => {
          if (!r.languages || r.languages.length === 0) {
            return <span className="text-xs text-slate-400">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {r.languages.map((l, i) => (
                <span
                  key={i}
                  className="inline-block text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                  title={l.trainingTitle || undefined}
                >
                  {l.languageCode}
                </span>
              ))}
            </div>
          );
        },
        className: "w-32",
      },
      {
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                className="text-slate-600 hover:text-slate-900"
                title="Edit Training Master"
              >
                <Link href={`/training-master/${r.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setItemToDelete(r)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete Training Master"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        className: "w-24 text-right",
      },
    ],
    [canUpdate, canDelete]
  );

  return (
    <>
      <PageHeader
        title="Training Master"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Training Master" }]}
      />

      <DataTable
        title="Training Master Directory"
        logoSrc="/logo.png"
        columns={columns}
        data={pageData.content || []}
        getRowId={(r, index) => (r.topicId ? `${r.id}-${r.topicId}-${index}` : `${r.id}-${index}`)}
        loading={isPending}
        emptyMessage={
          activeSearch
            ? `No records found matching "${activeSearch}"`
            : "No training master records found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search training master..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 w-44 pl-8 text-xs sm:w-56"
              />
            </form>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadData(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add Record button */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/training-master/new">
                  <Plus className="h-4 w-4" />
                  Add Training Master
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

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Master</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this training master record (ID: {itemToDelete?.id})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
