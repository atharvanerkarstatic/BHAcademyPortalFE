"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ImageUploadField } from "@/components/common/image-upload-field";
import {
  MultilingualContentTable,
  TRANSLATION_LANGUAGES,
} from "@/components/common/multilingual-content-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { updateCourseAction } from "@/features/courses/action";
import { CategorySelect } from "@/features/courses/components/category-select";
import type { UpdateCoursePayload, CourseItem } from "@/features/courses/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import {
  sanitizeTextInput,
  sanitizeNonNegativeNumber,
} from "@/lib/validations";

function EditCourseForm({ id, course }: { id: string; course: CourseItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  // Primary Course Fields
  const [categoryId, setCategoryId] = useState<string>(() =>
    String(course.categoryId ?? "")
  );
  const [courseName, setCourseName] = useState<string>(
    () => course.courseName || ""
  );
  const [courseLevel, setCourseLevel] = useState<string>(
    () => course.courseLevel || "Beginner"
  );
  const [duration, setDuration] = useState<string>(() => course.duration || "");
  const [mode, setMode] = useState<string>(() => course.mode || "virtual");
  const [points, setPoints] = useState<number | "">(() =>
    typeof course.points === "number" ? course.points : 0
  );
  const [noOfVideos, setNoOfVideos] = useState<number | "">(() =>
    typeof course.noOfVideos === "number" ? course.noOfVideos : 0
  );
  const [noOfCertifications, setNoOfCertifications] = useState<string>(
    () => course.noOfCertifications || "1"
  );
  const [imageUrl, setImageUrl] = useState<string>(() => course.imageUrl || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [courseDetails, setCourseDetails] = useState<string>(
    () => course.courseDetails || ""
  );

  // Multilingual courseName
  const [names, setNames] = useState<Record<string, string>>(() => ({
    courseNameAs: course.courseNameAs || "",
    courseNameBn: course.courseNameBn || "",
    courseNameGu: course.courseNameGu || "",
    courseNameHi: course.courseNameHi || "",
    courseNameKn: course.courseNameKn || "",
    courseNameMl: course.courseNameMl || "",
    courseNameMr: course.courseNameMr || "",
    courseNameOr: course.courseNameOr || "",
    courseNameTa: course.courseNameTa || "",
    courseNameTe: course.courseNameTe || "",
  }));

  // Multilingual courseDetails
  const [details, setDetails] = useState<Record<string, string>>(() => ({
    courseDetailsAs: course.courseDetailsAs || "",
    courseDetailsBn: course.courseDetailsBn || "",
    courseDetailsGu: course.courseDetailsGu || "",
    courseDetailsHi: course.courseDetailsHi || "",
    courseDetailsKn: course.courseDetailsKn || "",
    courseDetailsMl: course.courseDetailsMl || "",
    courseDetailsMr: course.courseDetailsMr || "",
    courseDetailsOr: course.courseDetailsOr || "",
    courseDetailsTa: course.courseDetailsTa || "",
    courseDetailsTe: course.courseDetailsTe || "",
  }));

  // Multilingual courseLevel
  const [levels, setLevels] = useState<Record<string, string>>(() => ({
    courseLevelAs: course.courseLevelAs || "",
    courseLevelBn: course.courseLevelBn || "",
    courseLevelGu: course.courseLevelGu || "",
    courseLevelHi: course.courseLevelHi || "",
    courseLevelKn: course.courseLevelKn || "",
    courseLevelMl: course.courseLevelMl || "",
    courseLevelMr: course.courseLevelMr || "",
    courseLevelOr: course.courseLevelOr || "",
    courseLevelTa: course.courseLevelTa || "",
    courseLevelTe: course.courseLevelTe || "",
  }));

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isUploadingImage) {
      toastError("Please wait for image upload to complete.");
      return;
    }

    const cleanCategoryId = categoryId.trim();
    if (!cleanCategoryId) {
      toastError("Please select a Category from the picklist.");
      return;
    }

    const cleanCourseName = sanitizeTextInput(courseName, 255);
    if (!cleanCourseName) {
      toastError("Course Name is required.");
      return;
    }

    const cleanCourseLevel = sanitizeTextInput(courseLevel, 100) || "Beginner";
    const cleanDuration = sanitizeTextInput(duration, 100);
    const cleanCertifications =
      noOfCertifications === ""
        ? "0"
        : String(sanitizeNonNegativeNumber(noOfCertifications, 0, 0));
    const cleanImageUrl = sanitizeTextInput(imageUrl, 500);
    const cleanCourseDetails = sanitizeTextInput(courseDetails, 5000);

    const sanitizedNames: Record<string, string> = {};
    for (const [key, val] of Object.entries(names)) {
      if (!val) {
        continue;
      }
      sanitizedNames[key] = sanitizeTextInput(val, 255);
    }

    const sanitizedLevels: Record<string, string> = {};
    for (const [key, val] of Object.entries(levels)) {
      if (!val) {
        continue;
      }
      sanitizedLevels[key] = sanitizeTextInput(val, 100);
    }

    const sanitizedDetails: Record<string, string> = {};
    for (const [key, val] of Object.entries(details)) {
      if (!val) {
        continue;
      }
      sanitizedDetails[key] = sanitizeTextInput(val, 5000);
    }

    const payload: UpdateCoursePayload = {
      categoryId: cleanCategoryId,
      courseName: cleanCourseName,
      points: sanitizeNonNegativeNumber(points, 0, 0),
      noOfVideos: sanitizeNonNegativeNumber(noOfVideos, 0, 0),
      noOfCertifications: cleanCertifications,
      courseLevel: cleanCourseLevel,
      duration: cleanDuration || undefined,
      imageUrl: cleanImageUrl || undefined,
      mode: mode.trim() || "virtual",
      courseDetails: cleanCourseDetails || undefined,
      ...sanitizedNames,
      ...sanitizedDetails,
      ...sanitizedLevels,
    };

    startTransition(async () => {
      const res = await updateCourseAction(id, payload);
      if (res.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
        ]);
        success(res.message || "Course updated successfully");
        router.push("/courses");
      } else {
        toastError(
          res.error || "Failed to update course. Please check all fields."
        );
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Courses"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Courses List", href: "/courses" },
          { label: "Edit Course" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Course
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <Link href="/courses">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="w-full space-y-6"
          >
            {/* Primary Details (Compact Centered Section) */}
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Category */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-category"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Category <span className="text-rose-500">*</span>
                </Label>
                <div className="sm:col-span-3">
                  <CategorySelect
                    value={categoryId}
                    onChange={(catId) => {
                      setCategoryId(catId);
                    }}
                  />
                </div>
              </div>

              {/* Course Name */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-name"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Course Name <span className="text-rose-500">*</span>
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="edit-course-name"
                    value={courseName}
                    onChange={(e) => {
                      setCourseName(e.target.value);
                    }}
                    placeholder="e.g. Introduction to Digital Education"
                    maxLength={255}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Course Level */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-level"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Course Level
                </Label>
                <div className="sm:col-span-3">
                  <select
                    id="edit-course-level"
                    value={courseLevel}
                    onChange={(e) => {
                      setCourseLevel(e.target.value);
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-duration"
                  className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Duration <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-1 sm:col-span-3">
                  <Input
                    id="edit-course-duration"
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                    }}
                    type="text"
                    placeholder="e.g. 32.03 mins or 1:20:39 hours"
                    maxLength={100}
                    className="h-9 text-xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Allowed decimal values or time formats. E.g.{" "}
                    <span className="font-medium text-slate-700">
                      32.03 mins
                    </span>{" "}
                    or{" "}
                    <span className="font-medium text-slate-700">
                      1:20:39 hours
                    </span>
                  </p>
                </div>
              </div>

              {/* Mode of Course */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-mode"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Mode
                </Label>
                <div className="sm:col-span-3">
                  <select
                    id="edit-course-mode"
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="virtual">Virtual</option>
                    <option value="physical">Physical</option>
                  </select>
                </div>
              </div>

              {/* Points */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-points"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Points
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="edit-course-points"
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => {
                      setPoints(
                        e.target.value === ""
                          ? ""
                          : sanitizeNonNegativeNumber(e.target.value, 0, 0)
                      );
                    }}
                    placeholder="0"
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Number of Videos */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-videos"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  No. of Videos
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="edit-course-videos"
                    type="number"
                    min="0"
                    value={noOfVideos}
                    onChange={(e) => {
                      setNoOfVideos(
                        e.target.value === ""
                          ? ""
                          : sanitizeNonNegativeNumber(e.target.value, 0, 0)
                      );
                    }}
                    placeholder="0"
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Number of Certifications */}
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-certifications"
                  className="text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Certifications
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="edit-course-certifications"
                    value={noOfCertifications}
                    type="number"
                    min="0"
                    onChange={(e) => {
                      setNoOfCertifications(
                        e.target.value === ""
                          ? ""
                          : String(
                              sanitizeNonNegativeNumber(e.target.value, 0, 0)
                            )
                      );
                    }}
                    placeholder="e.g. 1"
                    maxLength={50}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Course Image */}
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-image-file"
                  className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Course Image
                </Label>
                <div className="sm:col-span-3">
                  <ImageUploadField
                    id="edit-course-image-file"
                    value={imageUrl}
                    onChange={setImageUrl}
                    pathPrefix="course_image"
                    disabled={isPending}
                    onUploadingChange={setIsUploadingImage}
                    previewAlt="Course Preview"
                  />
                </div>
              </div>

              {/* Course Details */}
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
                <Label
                  htmlFor="edit-course-details"
                  className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
                >
                  Course Details
                </Label>
                <div className="sm:col-span-3">
                  <Textarea
                    id="edit-course-details"
                    rows={3}
                    value={courseDetails}
                    onChange={(e) => {
                      setCourseDetails(e.target.value);
                    }}
                    placeholder="Overview of the course syllabus and topics covered..."
                    maxLength={5000}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Multilingual Section Divider (Wide Section) */}
            <div className="w-full border-t border-slate-100 pt-6">
              <div className="mb-3 flex items-center gap-2">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                  Multilingual Course Content (Optional)
                </h3>
              </div>
              <MultilingualContentTable
                languages={TRANSLATION_LANGUAGES}
                names={names}
                levels={levels}
                details={details}
                onNameChange={(key, val) => {
                  setNames((prev) => ({ ...prev, [key]: val }));
                }}
                onLevelChange={(key, val) => {
                  setLevels((prev) => ({ ...prev, [key]: val }));
                }}
                onDetailsChange={(key, val) => {
                  setDetails((prev) => ({ ...prev, [key]: val }));
                }}
                nameKeyPrefix="courseName"
                levelKeyPrefix="courseLevel"
                detailsKeyPrefix="courseDetails"
                namePlaceholder="Course Name"
                levelPlaceholder="Level"
                detailsPlaceholder="Details"
                nameMaxLength={255}
                levelMaxLength={100}
                detailsMaxLength={5000}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 min-w-24 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
                className="h-8 min-w-24 border-slate-300 text-xs font-medium uppercase"
              >
                BACK
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditCoursePage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const {
    data: course,
    isLoading,
    isFetching,
    isPaused,
    isFetchedAfterMount,
    error,
  } = useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: ({ signal }) =>
      portalGet<CourseItem>(
        `courses/${encodeURIComponent(id)}`,
        undefined,
        signal
      ),
    enabled: Boolean(id),
    refetchOnMount: "always",
    refetchOnReconnect: false,
  });

  if (isLoading || ((isFetching || isPaused) && !isFetchedAfterMount)) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses List
          </Link>
        </Button>
        <Card className="p-8 text-center text-sm text-slate-500">
          {error instanceof Error
            ? error.message
            : "Failed to load course details."}
        </Card>
      </div>
    );
  }

  return (
    <EditCourseForm key={String(course.id ?? id)} id={id} course={course} />
  );
}
