"use client";

import { Download, Edit, ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { CourseItem } from "@/features/courses/types";
import { useAuth } from "@/lib/auth-context";
import { downloadCsv } from "@/lib/download";

interface CourseDetailsSidebarProps {
  course: CourseItem;
  onDeleteClick: () => void;
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function CourseDetailsSidebar({
  course,
  onDeleteClick,
}: CourseDetailsSidebarProps) {
  const { can } = useAuth();
  const { success } = useToast();

  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const canUpdate = can("courses.update");
  const canDelete = can("courses.delete");

  const showCourseImage = Boolean(
    course.imageUrl &&
    course.imageUrl.startsWith("http") &&
    failedImageUrl !== course.imageUrl
  );

  const handleDownloadDetails = () => {
    const csvContent = `id,courseName,categoryId\n${course.id},${escapeCsvCell(course.courseName)},${escapeCsvCell(course.categoryId)}\n`;
    downloadCsv(csvContent, `course_${course.id}_details.csv`);
    success("Course details downloaded");
  };

  return (
    <div className="space-y-4 lg:col-span-4 xl:col-span-3">
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b bg-white px-4 py-3">
          <CardTitle className="text-base font-semibold text-slate-900">
            Course Details
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {showCourseImage && course.imageUrl ? (
              <img
                src={course.imageUrl}
                alt={course.courseName}
                className="h-full w-full object-cover"
                onError={() => {
                  setFailedImageUrl(course.imageUrl ?? null);
                }}
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-slate-400" />
            )}
          </div>

          <div className="border-b pb-3 text-center text-sm font-semibold text-slate-800">
            {course.courseName}
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-1">
              <span className="font-semibold text-slate-700">Module:</span>
              <span className="col-span-2 truncate text-slate-600">
                {course.courseName}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-semibold text-slate-700">Category:</span>
              <span className="col-span-2 truncate text-slate-600">
                {course.categoryName || course.categoryId}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-semibold text-slate-700">Admin Entry:</span>
              <span className="col-span-2 text-slate-400">—</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-semibold text-slate-700">Course Code:</span>
              <span className="col-span-2 font-mono text-slate-700">
                {course.courseLevel || "WDA"}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t pt-2">
            {canUpdate && (
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-8 w-full justify-center gap-1.5 border-blue-400 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                <Link href={`/courses/${course.id}/edit`}>
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={onDeleteClick}
                className="h-8 w-full justify-center gap-1.5 border-rose-300 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-8 w-full justify-center gap-1.5 border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={handleDownloadDetails}
            >
              <Download className="h-3.5 w-3.5 text-teal-600" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
