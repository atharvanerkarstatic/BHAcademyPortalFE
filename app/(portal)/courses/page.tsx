"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Clock,
  Download,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { DataTable } from '@/components/common/data-table';
import type { Column } from '@/components/common/data-table';
import { PageHeader } from "@/components/common/page-header";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  deleteCourseAction,
  exportCoursesAction,
  toggleCourseStatusAction,
} from "@/features/courses/action";
import type { CourseItem, CoursePageResponse } from "@/features/courses/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const EMPTY_PAGE: CoursePageResponse = {
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

function CoursesView() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category")?.trim() || null;

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [togglingCourseId, setTogglingCourseId] = useState<number | null>(null);

  const canCreate = can("courses.create");
  const canUpdate = can("courses.update");
  const canDelete = can("courses.delete");
  const canExport = can("courses.export") || can("courses.read");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setActiveSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const listQueryKey = queryKeys.courses.list({
    page,
    size: PAGE_SIZE,
    search: activeSearch,
    sort: "ASC",
  });

  const pagedQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: ({ signal }) =>
      portalGet<CoursePageResponse>(
        "courses",
        { page, size: PAGE_SIZE, search: activeSearch, sort: "ASC" },
        signal
      ),
    enabled: !categoryId,
    placeholderData: keepPreviousData,
  });

  const categoryQuery = useQuery({
    queryKey: queryKeys.courses.byCategory(categoryId ?? ""),
    queryFn: ({ signal }) =>
      portalGet<Array<CourseItem>>(
        `courses/by-category/${encodeURIComponent(categoryId ?? "")}`,
        undefined,
        signal
      ),
    enabled: Boolean(categoryId),
  });

  const pageData = pagedQuery.data ?? EMPTY_PAGE;
  const categoryCourses = useMemo(() => categoryQuery.data ?? [], [categoryQuery.data]);
  const isInitialLoading = categoryId ? categoryQuery.isLoading : pagedQuery.isLoading;
  const isFetching = categoryId ? categoryQuery.isFetching : pagedQuery.isFetching;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCourseAction(id),
    onSuccess: async (res) => {
      setCourseToDelete(null);
      if (res.success) {
        success(res.message || "Course deleted successfully");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
        ]);
      } else {
        toastError(res.error || "Failed to delete course");
      }
    },
    onError: () => {
      setCourseToDelete(null);
      toastError("Failed to delete course");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (course: CourseItem) => toggleCourseStatusAction(course.id),
    onMutate: (course) => {
      setTogglingCourseId(course.id);
    },
    onSuccess: async (res, course) => {
      if (res.success) {
        const newStatus =
          typeof res.data === "string" && res.data
            ? res.data
            : course.status?.toUpperCase() === "ACTIVE"
              ? "INACTIVE"
              : "ACTIVE";

        queryClient.setQueryData<CoursePageResponse>(listQueryKey, (prev) =>
          prev
            ? {
                ...prev,
                content: prev.content.map((item) =>
                  item.id === course.id ? { ...item, status: newStatus } : item
                ),
              }
            : prev
        );

        if (categoryId) {
          queryClient.setQueryData<Array<CourseItem>>(
            queryKeys.courses.byCategory(categoryId),
            (prev) =>
              prev?.map((item) =>
                item.id === course.id ? { ...item, status: newStatus } : item
              )
          );
        }

        success(res.message || "Course status updated successfully");
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      } else {
        toastError(res.error || "Failed to update course status");
      }
    },
    onError: () => {
      toastError("Failed to update course status");
    },
    onSettled: () => {
      setTogglingCourseId(null);
    },
  });

  const toggleStatus = toggleStatusMutation.mutate;

  const handleToggleStatus = useCallback(
    (course: CourseItem) => {
      if (!canUpdate) {
        toastError("You do not have permission to update course status.");
        return;
      }
      toggleStatus(course);
    },
    [canUpdate, toastError, toggleStatus]
  );

  const handleRefresh = async () => {
    setPage(1);
    const result = categoryId ? await categoryQuery.refetch() : await pagedQuery.refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load courses");
    } else {
      success("Courses refreshed successfully");
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setPage(1);
    setActiveSearch("");
  };

  const visibleCourses = useMemo(() => {
    if (!categoryId) {
      return pageData.content;
    }
    const query = activeSearch.toLowerCase();
    if (!query) {
      return categoryCourses;
    }

    return categoryCourses.filter(
      (course) =>
        course.courseName?.toLowerCase().includes(query) ||
        course.categoryName?.toLowerCase().includes(query) ||
        String(course.id).includes(query)
    );
  }, [categoryId, categoryCourses, pageData.content, activeSearch]);

  const columns: Array<Column<CourseItem>> = useMemo(() => {
    const cols: Array<Column<CourseItem>> = [
      {
        header: "ID",
        cell: (row) => <span className="font-mono text-xs font-semibold text-slate-700">{row.id}</span>,
        className: "w-16 text-center",
      },
      {
        header: "Image",
        cell: (row) => {
          const validImg = row.imageUrl && row.imageUrl.startsWith("http");
          return (
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {validImg ? (
                <img
                  src={row.imageUrl}
                  alt={row.courseName}
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
        header: "Course Code",
        cell: (row) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {row.courseCode || "—"}
          </span>
        ),
        className: "w-32",
      },
      {
        header: "Course Name",
        cell: (row) => (
          <div className="max-w-xs space-y-0.5">
            <p className="font-medium text-slate-900 leading-snug">{row.courseName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {row.categoryName || row.categoryId}
              </span>
              {row.courseNameHi ? (
                <span className="text-[11px] text-slate-500 font-normal truncate max-w-[180px]">
                  {row.courseNameHi}
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        header: "Level",
        cell: (row) => {
          if (!row.courseLevel) {
            return <span className="text-xs text-slate-400">—</span>;
          }

          const level = row.courseLevel.toLowerCase();
          const badgeClass =
            level === "basic"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : level === "intermediate"
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-purple-50 text-purple-700 border-purple-200";

          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
            >
              {row.courseLevel}
            </span>
          );
        },
        className: "w-28 text-center",
      },
      {
        header: "Mode",
        cell: (row) => (
          <span className="text-xs font-medium text-slate-700">{row.mode || "Virtual"}</span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Duration",
        cell: (row) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{row.duration ? `${row.duration} m` : "—"}</span>
          </div>
        ),
        className: "w-24",
      },
      {
        header: "Videos",
        cell: (row) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Video className="h-3 w-3 text-slate-400" />
            <span>{row.noOfVideos ?? 0}</span>
          </div>
        ),
        className: "w-20",
      },
      {
        header: "Points",
        cell: (row) => (
          <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            {row.points ?? 0} pts
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Certifications",
        cell: (row) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Award className="h-3 w-3 text-amber-500" />
            <span>
              {row.noOfCertifications ? Number(row.noOfCertifications).toLocaleString() : 0}
            </span>
          </div>
        ),
        className: "w-28",
      },
      {
        header: "Status",
        cell: (row) => {
          const isActive = row.status?.toUpperCase() === "ACTIVE";
          const isToggling = togglingCourseId === row.id;

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
              onClick={() => handleToggleStatus(row)}
              title={`Click to toggle status (${isActive ? "Inactivate" : "Activate"})`}
              className={cn(
                "group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all shadow-xs border cursor-pointer",
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
        header: "Manage",
        cell: (row) => (
          <Button
            asChild
            size="xs"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-none h-6 px-2.5 text-xs"
          >
            <Link href={`/courses/${row.id}`} prefetch={false}>
              Manage
            </Link>
          </Button>
        ),
        className: "w-24 text-center",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            {canUpdate ? (
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                title="Edit Course"
              >
                <Link href={`/courses/${row.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}

            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCourseToDelete(row)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete Course"
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
  }, [canUpdate, canDelete, togglingCourseId, handleToggleStatus, setCourseToDelete]);

  const handleDownloadCourses = async () => {
    setIsExporting(true);
    try {
      const res = await exportCoursesAction();
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || "courses_export.csv");
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        success("Courses CSV downloaded successfully");
      } else {
        toastError(res.error || "Failed to download courses CSV");
      }
    } catch {
      toastError("Failed to export courses.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Manage Courses"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Courses List" }]}
      />

      <DataTable
        title="Courses List"
        logoSrc="/logo.png"
        columns={columns}
        data={visibleCourses}
        getRowId={(row) => row.id}
        loading={isInitialLoading}
        emptyMessage={
          activeSearch
            ? `No courses matching "${activeSearch}"`
            : categoryId
              ? "No courses in this category"
              : "No courses found"
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search courses..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-8 w-44 pl-8 pr-14 text-xs sm:w-56"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-8 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              ) : null}
              <Button type="submit" variant="ghost" size="sm" className="hidden">
                Search
              </Button>
            </form>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canExport ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCourses}
                disabled={isExporting}
                className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
              >
                <Download className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`} />
                <span>{isExporting ? "Downloading…" : "Download Courses"}</span>
              </Button>
            ) : null}

            {canCreate ? (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/courses/new">
                  <Plus className="h-4 w-4" />
                  Add Course
                </Link>
              </Button>
            ) : null}
          </div>
        }
        pagination={
          categoryId
            ? undefined
            : {
                page,
                pageSize: PAGE_SIZE,
                totalElements: pageData.totalElements,
                totalPages: pageData.totalPages,
                onPageChange: setPage,
              }
        }
      />

      <AlertDialog
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCourseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course (ID: {courseToDelete?.id})?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">
                {courseToDelete?.courseName}
              </strong>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (courseToDelete) {
                  deleteMutation.mutate(courseToDelete.id);
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesView />
    </Suspense>
  );
}
