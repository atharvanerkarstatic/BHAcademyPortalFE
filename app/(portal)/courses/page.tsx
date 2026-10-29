"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Image as ImageIcon, Award, Video, Clock, Pencil, Trash2, Download } from "lucide-react";

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
import { getCoursesAction, deleteCourseAction, exportCoursesAction } from "@/features/courses/action";
import type { CourseItem, CoursePageResponse } from "@/features/courses/types";

export default function CoursesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<CoursePageResponse>({
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

  // Export CSV state
  const [isExporting, setIsExporting] = useState(false);

  // Delete modal state
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission flags
  const canCreate = can("courses.create");
  const canUpdate = can("courses.update");
  const canDelete = can("courses.delete");
  const canExport = can("courses.export") || can("courses.read");




  const loadCourses = (
    targetPage = page,
    searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    startTransition(async () => {
      const res = await getCoursesAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
        sort: "ASC",
      });

      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Courses refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load courses");
      }
    });
  };

  useEffect(() => {
    loadCourses(page, activeSearch);
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
    if (!courseToDelete) return;
    setIsDeleting(true);

    const res = await deleteCourseAction(courseToDelete.id);
    setIsDeleting(false);
    setCourseToDelete(null);

    if (res.success) {
      success(res.message || "Course deleted successfully");
      loadCourses(page, activeSearch);
    } else {
      toastError(res.error || "Failed to delete course");
    }
  };

  const columns: Column<CourseItem>[] = useMemo(() => {
    const cols: Column<CourseItem>[] = [
      {
        header: "ID",
        cell: (r) => <span className="font-mono text-xs font-semibold text-slate-700">#{r.id}</span>,
        className: "w-16 text-center",
      },
      {
        header: "Image",
        cell: (r) => {
          const validImg = r.imageUrl && r.imageUrl.startsWith("http");
          return (
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {validImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.imageUrl}
                  alt={r.courseName}
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
        header: "Course Name",
        cell: (r) => (
          <div className="max-w-xs space-y-0.5">
            <p className="font-medium text-slate-900 leading-snug">{r.courseName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {r.categoryName || r.categoryId}
              </span>
              {r.courseNameHi && (
                <span className="text-[11px] text-slate-500 font-normal truncate max-w-[180px]">
                  {r.courseNameHi}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        header: "Level",
        cell: (r) => {
          if (!r.courseLevel) return <span className="text-xs text-slate-400">—</span>;

          const level = r.courseLevel.toLowerCase();
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
              {r.courseLevel}
            </span>
          );
        },
        className: "w-28 text-center",
      },
      {
        header: "Mode",
        cell: (r) => (
          <span className="text-xs font-medium text-slate-700">
            {r.mode || "Virtual"}
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Duration",
        cell: (r) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{r.duration ? `${r.duration} m` : "—"}</span>
          </div>
        ),
        className: "w-24",
      },
      {
        header: "Videos",
        cell: (r) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Video className="h-3 w-3 text-slate-400" />
            <span>{r.noOfVideos ?? 0}</span>
          </div>
        ),
        className: "w-20",
      },
      {
        header: "Points",
        cell: (r) => (
          <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            {r.points ?? 0} pts
          </span>
        ),
        className: "w-20 text-center",
      },
      {
        header: "Certifications",
        cell: (r) => (
          <div className="flex items-center gap-1 text-xs text-slate-700">
            <Award className="h-3 w-3 text-amber-500" />
            <span>{r.noOfCertifications ? Number(r.noOfCertifications).toLocaleString() : 0}</span>
          </div>
        ),
        className: "w-28",
      },
      {
        header: "Status",
        cell: (r) => <StatusText active={r.status === "ACTIVE"} />,
        className: "w-24 text-center",
      },
      {
        header: "Manage",
        cell: (r) => (
          <Button
            asChild
            size="xs"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-none h-6 px-2.5 text-xs"
          >
            <Link href={`/courses/${r.id}`} prefetch={false}>Manage</Link>
          </Button>
        ),
        className: "w-24 text-center",
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
                title="Edit Course"
              >
                <Link href={`/courses/${r.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCourseToDelete(r)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete Course"
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        success("Courses CSV downloaded successfully");
      } else {
        toastError(res.error || "Failed to download courses CSV");
      }
    } catch (err) {
      console.error("Export error:", err);
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
        data={pageData.content}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage={activeSearch ? `No courses matching "${activeSearch}"` : "No courses found"}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search courses..."
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
                loadCourses(1, activeSearch, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Download Courses button */}
            {canExport && (
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
            )}

            {/* Add Course button visible only if user has courses.create permission */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/courses/new">
                  <Plus className="h-4 w-4" />
                  Add Course
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
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course (#{courseToDelete?.id})?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">
                {courseToDelete?.courseName}
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