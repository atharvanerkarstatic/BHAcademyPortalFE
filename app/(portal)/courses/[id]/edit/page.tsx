"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CategorySelect } from "@/features/courses/components/category-select";
import { getCourseByIdAction, updateCourseAction } from "@/features/courses/action";
import type { UpdateCoursePayload, CourseItem } from "@/features/courses/types";

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
  const [error, setError] = useState<string | null>(null);

  // Primary Course Fields - always stored as strings/numbers
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
        const rawCatId = item.categoryId != null ? String(item.categoryId) : "";
        setCategoryId(rawCatId);
        setCourseName(item.courseName ? String(item.courseName) : "");
        setCourseLevel(item.courseLevel ? String(item.courseLevel) : "Beginner");
        setDuration(item.duration ? String(item.duration) : "");
        setMode(item.mode ? String(item.mode) : "virtual");
        setPoints(item.points ?? 0);
        setNoOfVideos(item.noOfVideos ?? 0);
        setNoOfCertifications(item.noOfCertifications != null ? String(item.noOfCertifications) : "1");
        setImageUrl(item.imageUrl ? String(item.imageUrl) : "");
        setCourseDetails(item.courseDetails ? String(item.courseDetails) : "");

        // Populate multilingual fields safely
        const loadedNames: Record<string, string> = {};
        const loadedDetails: Record<string, string> = {};
        const loadedLevels: Record<string, string> = {};

        for (const lang of TRANSLATION_LANGUAGES) {
          const nKey = `courseName${lang.code}` as keyof CourseItem;
          const dKey = `courseDetails${lang.code}` as keyof CourseItem;
          const lKey = `courseLevel${lang.code}` as keyof CourseItem;

          if (item[nKey] != null) loadedNames[`courseName${lang.code}`] = String(item[nKey]);
          if (item[dKey] != null) loadedDetails[`courseDetails${lang.code}`] = String(item[dKey]);
          if (item[lKey] != null) loadedLevels[`courseLevel${lang.code}`] = String(item[lKey]);
        }

        setNames(loadedNames);
        setDetails(loadedDetails);
        setLevels(loadedLevels);
      } else {
        const msg = res.error || "Failed to load course details";
        setError(msg);
        toastError(msg);
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Guaranteed string conversions preventing any *.trim is not a function error
    const cleanCategoryId = String(categoryId ?? "").trim();
    if (!cleanCategoryId) {
      setError("Please select a Category from the picklist.");
      return;
    }

    const cleanCourseName = String(courseName ?? "").trim();
    if (!cleanCourseName) {
      setError("Course Name is required.");
      return;
    }

    if (cleanCourseName.length > 255) {
      setError("Character size limit exceeded: Course Name must not exceed 255 characters.");
      return;
    }

    const cleanCourseLevel = String(courseLevel ?? "Beginner").trim();
    if (cleanCourseLevel.length > 100) {
      setError("Character size limit exceeded: Course Level must not exceed 100 characters.");
      return;
    }

    const cleanDuration = String(duration ?? "").trim();
    if (cleanDuration.length > 100) {
      setError("Character size limit exceeded: Duration must not exceed 100 characters.");
      return;
    }

    const cleanCertifications = String(noOfCertifications ?? "1").trim();
    if (cleanCertifications.length > 50) {
      setError("Character size limit exceeded: Number of Certifications must not exceed 50 characters.");
      return;
    }

    const cleanImageUrl = String(imageUrl ?? "").trim();
    if (cleanImageUrl.length > 500) {
      setError("Character size limit exceeded: Image URL must not exceed 500 characters.");
      return;
    }

    const cleanCourseDetails = String(courseDetails ?? "").trim();
    if (cleanCourseDetails.length > 5000) {
      setError("Character size limit exceeded: Course Details must not exceed 5000 characters.");
      return;
    }

    // Check translation limits
    for (const [key, val] of Object.entries(names)) {
      if (val && String(val).length > 255) {
        setError(`Character size limit exceeded: ${key} must not exceed 255 characters.`);
        return;
      }
    }
    for (const [key, val] of Object.entries(levels)) {
      if (val && String(val).length > 100) {
        setError(`Character size limit exceeded: ${key} must not exceed 100 characters.`);
        return;
      }
    }
    for (const [key, val] of Object.entries(details)) {
      if (val && String(val).length > 5000) {
        setError(`Character size limit exceeded: ${key} must not exceed 5000 characters.`);
        return;
      }
    }

    const payload: UpdateCoursePayload = {
      categoryId: cleanCategoryId,
      courseName: cleanCourseName,
      points: points === "" ? 0 : Number(points),
      noOfVideos: noOfVideos === "" ? 0 : Number(noOfVideos),
      noOfCertifications: cleanCertifications || "1",
      courseLevel: cleanCourseLevel || "Beginner",
      duration: cleanDuration || undefined,
      imageUrl: cleanImageUrl || undefined,
      mode: String(mode ?? "virtual").trim() || "virtual",
      courseDetails: cleanCourseDetails || undefined,
      ...names,
      ...details,
      ...levels,
    };

    startTransition(async () => {
      const res = await updateCourseAction(id, payload);
      if (res.success) {
        success(res.message || "Course updated successfully");
        router.push("/courses");
      } else {
        console.error("Backend error from updateCourseAction:", res.error);

        const errText = (res.error || "").toLowerCase();
        let displayMsg = "Failed to update course. Please check all fields and try again.";
        if (
          errText.includes("character") ||
          errText.includes("size") ||
          errText.includes("limit") ||
          errText.includes("too long") ||
          errText.includes("length")
        ) {
          displayMsg = "Character size limit exceeded. Please ensure all inputs are within the allowed length.";
        }

        setError(displayMsg);
        toastError(displayMsg);
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading course details…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit Course: ${courseName || id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Courses List", href: "/courses" },
          { label: `Edit #${id}` },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Basic Course Information */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle>Course Information</CardTitle>
            </div>
            <CardDescription>
              Update course basics like category, name, duration, points, and mode.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category-select">
                  Category <span className="text-red-500">*</span>
                </Label>
                <CategorySelect
                  value={String(categoryId || "")}
                  onChange={(catId) => setCategoryId(String(catId || ""))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="courseName">
                  Course Name (English) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Introduction to Digital Education"
                  maxLength={255}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="courseLevel">Course Level</Label>
                <Input
                  id="courseLevel"
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  placeholder="e.g. Beginner, Intermediate, Advanced"
                  maxLength={100}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 4 weeks, 30m"
                  maxLength={100}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="noOfVideos">No. of Videos</Label>
                <Input
                  id="noOfVideos"
                  type="number"
                  min="0"
                  value={noOfVideos}
                  onChange={(e) => setNoOfVideos(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="noOfCertifications">No. of Certifications</Label>
                <Input
                  id="noOfCertifications"
                  value={noOfCertifications}
                  onChange={(e) => setNoOfCertifications(e.target.value)}
                  placeholder="e.g. 1"
                  maxLength={50}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mode">Mode</Label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="virtual">Virtual</option>
                  <option value="classroom">Classroom</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="courseDetails">Course Details / Overview</Label>
              <Textarea
                id="courseDetails"
                rows={3}
                value={courseDetails}
                onChange={(e) => setCourseDetails(e.target.value)}
                placeholder="Detailed description of the course content..."
                maxLength={5000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Course Details */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-600" />
              <CardTitle>Multilingual Course Info</CardTitle>
            </div>
            <CardDescription>
              Translations for Course Name, Level, and Details across regional languages.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {TRANSLATION_LANGUAGES.map((lang) => {
              const nameKey = `courseName${lang.code}`;
              const levelKey = `courseLevel${lang.code}`;
              const detailKey = `courseDetails${lang.code}`;

              return (
                <div key={lang.code} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">{lang.name}</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor={nameKey} className="text-xs text-slate-600">Course Name</Label>
                      <Input
                        id={nameKey}
                        value={names[nameKey] || ""}
                        onChange={(e) => setNames((prev) => ({ ...prev, [nameKey]: e.target.value }))}
                        placeholder={`Course Name in ${lang.name}`}
                        maxLength={255}
                        className="bg-white"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor={levelKey} className="text-xs text-slate-600">Course Level</Label>
                      <Input
                        id={levelKey}
                        value={levels[levelKey] || ""}
                        onChange={(e) => setLevels((prev) => ({ ...prev, [levelKey]: e.target.value }))}
                        placeholder={`Level in ${lang.name}`}
                        maxLength={100}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor={detailKey} className="text-xs text-slate-600">Course Details</Label>
                    <Textarea
                      id={detailKey}
                      rows={2}
                      value={details[detailKey] || ""}
                      onChange={(e) => setDetails((prev) => ({ ...prev, [detailKey]: e.target.value }))}
                      placeholder={`Course Details in ${lang.name}`}
                      maxLength={5000}
                      className="bg-white text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild disabled={isPending}>
            <Link href="/courses">Cancel</Link>
          </Button>

          <Button type="submit" disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-700 min-w-32">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
