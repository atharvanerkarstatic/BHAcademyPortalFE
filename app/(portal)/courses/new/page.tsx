"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Languages, Loader2, X } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CategorySelect } from "@/features/courses/components/category-select";
import { createCourseAction } from "@/features/courses/action";
import { uploadMediaAction } from "@/features/accounts/action";
import type { CreateCoursePayload } from "@/features/courses/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber, validateImageFile } from "@/lib/validations";
import { MultilingualContentTable, TRANSLATION_LANGUAGES } from "@/components/common/multilingual-content-table";

export default function NewCoursePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formKey, setFormKey] = useState<number>(() => Date.now());

  // Primary Course Fields
  const [categoryId, setCategoryId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseLevel, setCourseLevel] = useState("Beginner");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState("virtual");
  const [points, setPoints] = useState<number | "">(0);
  const [noOfVideos, setNoOfVideos] = useState<number | "">(0);
  const [noOfCertifications, setNoOfCertifications] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [courseDetails, setCourseDetails] = useState("");

  // Multilingual courseName
  const [names, setNames] = useState<Record<string, string>>({
    courseNameAs: "",
    courseNameBn: "",
    courseNameGu: "",
    courseNameHi: "",
    courseNameKn: "",
    courseNameMl: "",
    courseNameMr: "",
    courseNameOr: "",
    courseNameTa: "",
    courseNameTe: "",
  });

  // Multilingual courseDetails
  const [details, setDetails] = useState<Record<string, string>>({
    courseDetailsAs: "",
    courseDetailsBn: "",
    courseDetailsGu: "",
    courseDetailsHi: "",
    courseDetailsKn: "",
    courseDetailsMl: "",
    courseDetailsMr: "",
    courseDetailsOr: "",
    courseDetailsTa: "",
    courseDetailsTe: "",
  });

  // Multilingual courseLevel
  const [levels, setLevels] = useState<Record<string, string>>({
    courseLevelAs: "",
    courseLevelBn: "",
    courseLevelGu: "",
    courseLevelHi: "",
    courseLevelKn: "",
    courseLevelMl: "",
    courseLevelMr: "",
    courseLevelOr: "",
    courseLevelTa: "",
    courseLevelTe: "",
  });

  const resetForm = () => {
    setCategoryId("");
    setCourseName("");
    setCourseLevel("Beginner");
    setDuration("");
    setMode("virtual");
    setPoints(0);
    setNoOfVideos(0);
    setNoOfCertifications("1");
    setImageUrl("");
    setCourseDetails("");
    setNames({
      courseNameAs: "",
      courseNameBn: "",
      courseNameGu: "",
      courseNameHi: "",
      courseNameKn: "",
      courseNameMl: "",
      courseNameMr: "",
      courseNameOr: "",
      courseNameTa: "",
      courseNameTe: "",
    });
    setDetails({
      courseDetailsAs: "",
      courseDetailsBn: "",
      courseDetailsGu: "",
      courseDetailsHi: "",
      courseDetailsKn: "",
      courseDetailsMl: "",
      courseDetailsMr: "",
      courseDetailsOr: "",
      courseDetailsTa: "",
      courseDetailsTe: "",
    });
    setLevels({
      courseLevelAs: "",
      courseLevelBn: "",
      courseLevelGu: "",
      courseLevelHi: "",
      courseLevelKn: "",
      courseLevelMl: "",
      courseLevelMr: "",
      courseLevelOr: "",
      courseLevelTa: "",
      courseLevelTe: "",
    });
    setFormKey(Date.now());
  };

  useEffect(() => {
    resetForm();
    return () => {
      resetForm();
    };
  }, []);

  const handleCancel = () => {
    resetForm();
    router.push("/courses");
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB).");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `course_image_${Date.now()}`);

      const res = await uploadMediaAction(formData);
      if (res.success && res.data) {
        setImageUrl(res.data);
        success("Image uploaded successfully and converted to URL.");
      } else {
        toastError(res.error || "Failed to upload image. Please try again.");
      }
    } catch (err) {
      console.error("Course image upload failed:", err);
      toastError("Failed to upload image file. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isUploadingImage) {
      toastError("Please wait for image upload to complete.");
      return;
    }

    const cleanCategoryId = String(categoryId || "").trim();
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
    const cleanDuration = duration === "" ? "" : String(sanitizeNonNegativeNumber(duration, 0, 0));
    const cleanCertifications = noOfCertifications === "" ? "0" : String(sanitizeNonNegativeNumber(noOfCertifications, 0, 0));
    const cleanImageUrl = sanitizeTextInput(imageUrl, 500);
    const cleanCourseDetails = sanitizeTextInput(courseDetails, 5000);

    const sanitizedNames: Record<string, string> = {};
    for (const [key, val] of Object.entries(names)) {
      if (!val) continue;
      sanitizedNames[key] = sanitizeTextInput(val, 255);
    }

    const sanitizedLevels: Record<string, string> = {};
    for (const [key, val] of Object.entries(levels)) {
      if (!val) continue;
      sanitizedLevels[key] = sanitizeTextInput(val, 100);
    }

    const sanitizedDetails: Record<string, string> = {};
    for (const [key, val] of Object.entries(details)) {
      if (!val) continue;
      sanitizedDetails[key] = sanitizeTextInput(val, 5000);
    }

    const payload: CreateCoursePayload = {
      categoryId: cleanCategoryId,
      courseName: cleanCourseName,
      points: sanitizeNonNegativeNumber(points, 0, 0),
      noOfVideos: sanitizeNonNegativeNumber(noOfVideos, 0, 0),
      noOfCertifications: cleanCertifications,
      courseLevel: cleanCourseLevel,
      duration: cleanDuration || undefined,
      imageUrl: cleanImageUrl || undefined,
      mode: String(mode ?? "virtual").trim() || "virtual",
      courseDetails: cleanCourseDetails || undefined,
      ...sanitizedNames,
      ...sanitizedDetails,
      ...sanitizedLevels,
    };

    startTransition(async () => {
      const res = await createCourseAction(payload);
      if (res.success) {
        success(res.message || "Course created successfully");
        resetForm();
        router.push("/courses");
      } else {
        toastError(res.error || "Failed to create course. Please check all fields.");
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
          { label: "Add New Course" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Course
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/courses">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            key={formKey}
            onSubmit={handleSubmit}
            autoComplete="off"
            className="w-full space-y-6"
          >
            {/* Primary Details (Compact Centered Section) */}
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-category"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Category <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <CategorySelect
                  value={categoryId}
                  onChange={(catId) => setCategoryId(catId)}
                />
              </div>
            </div>

            {/* Course Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Course Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Introduction to Digital Education"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Course Level */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-level"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Course Level
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-level"
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  placeholder="e.g. Beginner, Intermediate, Advanced"
                  maxLength={100}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-duration"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Duration <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value === "" ? "" : String(sanitizeNonNegativeNumber(e.target.value, 0, 0)))}
                  type="number"
                  min="0"
                  placeholder="0"
                  maxLength={100}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Mode of Course */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-mode"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mode
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="course-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="virtual">Virtual</option>
                  <option value="physical">Physical</option>
                </select>
              </div>
            </div>

            {/* Points */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-points"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Points
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-points"
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value === "" ? "" : sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  placeholder="0"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Number of Videos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-videos"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                No. of Videos
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-videos"
                  type="number"
                  min="0"
                  value={noOfVideos}
                  onChange={(e) => setNoOfVideos(e.target.value === "" ? "" : sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  placeholder="0"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Number of Certifications */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="course-certifications"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Certifications
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="course-certifications"
                  value={noOfCertifications}
                  type="number"
                  min="0"
                  onChange={(e) => setNoOfCertifications(e.target.value === "" ? "" : String(sanitizeNonNegativeNumber(e.target.value, 0, 0)))}
                  placeholder="e.g. 1"
                  maxLength={50}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Course Image */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label
                htmlFor="course-image-file"
                className="text-xs font-semibold text-slate-700 sm:text-right pt-2"
              >
                Course Image
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    id="course-image-file"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    disabled={isUploadingImage || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) handleImageUpload(file);
                    }}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {isUploadingImage && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                </p>

                {/* Uploaded Image Preview & Remove */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50/70 w-fit">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Course Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <div>
                        <span className="font-semibold text-emerald-600 block">
                          Image uploaded successfully
                        </span>
                        <span className="text-[10px] text-slate-400">Ready to save</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label
                htmlFor="course-details"
                className="text-xs font-semibold text-slate-700 sm:text-right pt-2"
              >
                Course Details <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Textarea
                  id="course-details"
                  rows={3}
                  value={courseDetails}
                  onChange={(e) => setCourseDetails(e.target.value)}
                  placeholder="Overview of the course syllabus and topics covered..."
                  maxLength={5000}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Multilingual Section Divider (Wide Section) */}
          <div className="pt-6 border-t border-slate-100 w-full">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Multilingual Course Content (Optional)
              </h3>
            </div>
            <MultilingualContentTable
              languages={TRANSLATION_LANGUAGES}
              names={names}
              levels={levels}
              details={details}
              onNameChange={(key, val) => setNames((prev) => ({ ...prev, [key]: val }))}
              onLevelChange={(key, val) => setLevels((prev) => ({ ...prev, [key]: val }))}
              onDetailsChange={(key, val) => setDetails((prev) => ({ ...prev, [key]: val }))}
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
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
