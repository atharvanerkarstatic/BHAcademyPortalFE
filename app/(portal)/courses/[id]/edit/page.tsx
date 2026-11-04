"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CategorySelect } from "@/features/courses/components/category-select";
import { getCourseByIdAction, updateCourseAction } from "@/features/courses/action";
import type { UpdateCoursePayload, CourseItem } from "@/features/courses/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber } from "@/lib/validations";

const TRANSLATION_LANGUAGES = [
  { code: "Hi", name: "Hindi (हिन्दी)" },
  { code: "Bn", name: "Bengali (বাংলা)" },
  { code: "Kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "Ml", name: "Malayalam (മലയാളം)" },
  { code: "Or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "Ta", name: "Tamil (தமிழ்)" },
  { code: "Te", name: "Telugu (తెలుగు)" },
  { code: "As", name: "Assamese (অসমীয়া)" },
  { code: "Gu", name: "Gujarati (ગુજરાતી)" },
  { code: "Mr", name: "Marathi (मराठी)" },
] as const;

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fetching, setFetching] = useState(true);

  // Primary Course Fields
  const [categoryId, setCategoryId] = useState<string>("");
  const [courseName, setCourseName] = useState<string>("");
  const [courseLevel, setCourseLevel] = useState<string>("Beginner");
  const [duration, setDuration] = useState<string>("");
  const [mode, setMode] = useState<string>("virtual");
  const [points, setPoints] = useState<number | "">(0);
  const [noOfVideos, setNoOfVideos] = useState<number | "">(0);
  const [noOfCertifications, setNoOfCertifications] = useState<string>("1");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [courseDetails, setCourseDetails] = useState<string>("");

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

  useEffect(() => {
    let mounted = true;

    (async () => {
      setFetching(true);
      const res = await getCourseByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        const item: CourseItem = res.data;
        setCategoryId(String(item.categoryId ?? ""));
        setCourseName(item.courseName || "");
        setCourseLevel(item.courseLevel || "Beginner");
        setDuration(item.duration || "");
        setMode(item.mode || "virtual");
        setPoints(typeof item.points === "number" ? item.points : 0);
        setNoOfVideos(typeof item.noOfVideos === "number" ? item.noOfVideos : 0);
        setNoOfCertifications(item.noOfCertifications || "1");
        setImageUrl(item.imageUrl || "");
        setCourseDetails(item.courseDetails || "");

        setNames({
          courseNameAs: item.courseNameAs || "",
          courseNameBn: item.courseNameBn || "",
          courseNameGu: item.courseNameGu || "",
          courseNameHi: item.courseNameHi || "",
          courseNameKn: item.courseNameKn || "",
          courseNameMl: item.courseNameMl || "",
          courseNameMr: item.courseNameMr || "",
          courseNameOr: item.courseNameOr || "",
          courseNameTa: item.courseNameTa || "",
          courseNameTe: item.courseNameTe || "",
        });

        setDetails({
          courseDetailsAs: item.courseDetailsAs || "",
          courseDetailsBn: item.courseDetailsBn || "",
          courseDetailsGu: item.courseDetailsGu || "",
          courseDetailsHi: item.courseDetailsHi || "",
          courseDetailsKn: item.courseDetailsKn || "",
          courseDetailsMl: item.courseDetailsMl || "",
          courseDetailsMr: item.courseDetailsMr || "",
          courseDetailsOr: item.courseDetailsOr || "",
          courseDetailsTa: item.courseDetailsTa || "",
          courseDetailsTe: item.courseDetailsTe || "",
        });

        setLevels({
          courseLevelAs: item.courseLevelAs || "",
          courseLevelBn: item.courseLevelBn || "",
          courseLevelGu: item.courseLevelGu || "",
          courseLevelHi: item.courseLevelHi || "",
          courseLevelKn: item.courseLevelKn || "",
          courseLevelMl: item.courseLevelMl || "",
          courseLevelMr: item.courseLevelMr || "",
          courseLevelOr: item.courseLevelOr || "",
          courseLevelTa: item.courseLevelTa || "",
          courseLevelTe: item.courseLevelTe || "",
        });
      } else {
        toastError(res.error || "Failed to load course details.");
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    const payload: UpdateCoursePayload = {
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
      const res = await updateCourseAction(id, payload);
      if (res.success) {
        success(res.message || "Course updated successfully");
        router.push("/courses");
      } else {
        toastError(res.error || "Failed to update course. Please check all fields.");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Courses"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Courses List", href: "/courses" },
          { label: `Edit Course #${id}` },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Course (#{id})
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
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Category */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-course-category"
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
                htmlFor="edit-course-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Course Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-course-name"
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
                htmlFor="edit-course-level"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Course Level
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-course-level"
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
                htmlFor="edit-course-duration"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Duration <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-course-duration"
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
                htmlFor="edit-course-mode"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mode
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="edit-course-mode"
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
                  onChange={(e) => setPoints(e.target.value === "" ? "" : sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  placeholder="0"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Number of Videos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
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
                  onChange={(e) => setNoOfVideos(e.target.value === "" ? "" : sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  placeholder="0"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Number of Certifications */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
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
                  onChange={(e) => setNoOfCertifications(e.target.value === "" ? "" : String(sanitizeNonNegativeNumber(e.target.value, 0, 0)))}
                  placeholder="e.g. 1"
                  maxLength={50}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-course-image"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Image URL <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-course-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="e.g. https://domain.com/course-banner.png"
                  maxLength={500}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label
                htmlFor="edit-course-details"
                className="text-xs font-semibold text-slate-700 sm:text-right pt-2"
              >
                Course Details
              </Label>
              <div className="sm:col-span-3">
                <Textarea
                  id="edit-course-details"
                  rows={3}
                  value={courseDetails}
                  onChange={(e) => setCourseDetails(e.target.value)}
                  placeholder="Overview of the course syllabus and topics covered..."
                  maxLength={5000}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Multilingual Section Divider */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Multilingual Course Content (Optional)
                </h3>
              </div>
              <div className="space-y-4">
                {TRANSLATION_LANGUAGES.map((lang) => {
                  const nameKey = `courseName${lang.code}`;
                  const levelKey = `courseLevel${lang.code}`;
                  const detailKey = `courseDetails${lang.code}`;
                  return (
                    <div
                      key={lang.code}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="font-semibold text-slate-800 text-xs">{lang.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono uppercase">{lang.code}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                        <Label htmlFor={nameKey} className="text-xs text-slate-600 sm:text-right">
                          Name
                        </Label>
                        <div className="sm:col-span-3">
                          <Input
                            id={nameKey}
                            placeholder={`Course Name in ${lang.name}`}
                            value={names[nameKey] || ""}
                            onChange={(e) => setNames((prev) => ({ ...prev, [nameKey]: e.target.value }))}
                            maxLength={255}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                        <Label htmlFor={levelKey} className="text-xs text-slate-600 sm:text-right">
                          Level
                        </Label>
                        <div className="sm:col-span-3">
                          <Input
                            id={levelKey}
                            placeholder={`Level in ${lang.name}`}
                            value={levels[levelKey] || ""}
                            onChange={(e) => setLevels((prev) => ({ ...prev, [levelKey]: e.target.value }))}
                            maxLength={100}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                        <Label htmlFor={detailKey} className="text-xs text-slate-600 sm:text-right pt-1.5">
                          Details
                        </Label>
                        <div className="sm:col-span-3">
                          <Textarea
                            id={detailKey}
                            rows={2}
                            placeholder={`Details in ${lang.name}`}
                            value={details[detailKey] || ""}
                            onChange={(e) => setDetails((prev) => ({ ...prev, [detailKey]: e.target.value }))}
                            maxLength={5000}
                            className="text-xs bg-white min-h-[50px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                asChild
                disabled={isPending}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                <Link href="/courses">CANCEL</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
