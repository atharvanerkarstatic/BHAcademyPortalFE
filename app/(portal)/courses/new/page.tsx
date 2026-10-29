"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createCourseAction } from "@/features/courses/action";
import type { CreateCoursePayload } from "@/features/courses/types";

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

export default function NewCoursePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    // Reset form state on mount to avoid stale cached inputs
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
    setError(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId.trim()) {
      setError("Please select a Category from the picklist.");
      return;
    }

    if (!courseName.trim()) {
      setError("Course Name is required.");
      return;
    }

    const payload: CreateCoursePayload = {
      categoryId: categoryId.trim(),
      courseName: courseName.trim(),
      points: points === "" ? 0 : Number(points),
      noOfVideos: noOfVideos === "" ? 0 : Number(noOfVideos),
      noOfCertifications: noOfCertifications.trim() || "1",
      courseLevel: courseLevel.trim() || "Beginner",
      duration: duration.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      mode: mode.trim() || "virtual",
      courseDetails: courseDetails.trim() || undefined,
      ...names,
      ...details,
      ...levels,
    };

    startTransition(async () => {
      const res = await createCourseAction(payload);
      if (res.success) {
        success(res.message || "Course created successfully");
        router.push("/courses");
      } else {
        const msg = res.error || "Failed to create course. Please check the fields and try again.";
        setError(msg);
        toastError(msg);
      }
    });
  };

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
        title="Add New Course"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Courses List", href: "/courses" },
          { label: "Add Course" },
        ]}
      />

      <form onSubmit={handleSubmit} className="w-full space-y-6">
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
              Select category and enter course basics like name, duration, points, and mode.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category-select">
                  Category <span className="text-red-500">*</span>
                </Label>
                <CategorySelect
                  value={categoryId}
                  onChange={(id) => setCategoryId(id)}
                  required
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
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 4 weeks, 30m"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mode">Mode</Label>
                <Input
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  placeholder="e.g. virtual, offline"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="noOfVideos">Number of Videos</Label>
                <Input
                  id="noOfVideos"
                  type="number"
                  min="0"
                  value={noOfVideos}
                  onChange={(e) => setNoOfVideos(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="noOfCertifications">Number of Certifications</Label>
                <Input
                  id="noOfCertifications"
                  value={noOfCertifications}
                  onChange={(e) => setNoOfCertifications(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/images/course.jpg"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="courseDetails">Course Details / Overview (English)</Label>
              <Textarea
                id="courseDetails"
                rows={3}
                value={courseDetails}
                onChange={(e) => setCourseDetails(e.target.value)}
                placeholder="Detailed description of the course..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Course Details */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              <CardTitle>Regional Language Translations</CardTitle>
            </div>
            <CardDescription>
              Optional translations for Course Name, Course Level, and Details across Indian regional languages.
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

          <Button type="submit" disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-700">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Course
          </Button>
        </div>
      </form>
    </div>
  );
}
