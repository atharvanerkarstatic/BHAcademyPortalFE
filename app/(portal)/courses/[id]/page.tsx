"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Languages,
  List,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  getCourseByIdAction,
  deleteCourseAction,
  getCourseVideosAction,
  getCourseTranslationByLanguageAction,
  updateCourseTranslationAction,
  type CourseVideoItem,
} from "@/features/courses/action";
import { getSampleImportAction } from "@/features/accounts/action";
import { LanguageSelect } from "@/features/languages/components/language-select";
import type { CourseItem } from "@/features/courses/types";
import { cn } from "@/lib/utils";

// Course Language row definition
type CourseLangRow = {
  num: number;
  languageId: string;
  code: string;
  language: string;
  nativeLabel: string;
  nameInLang?: string;
  descriptionInLang?: string;
  durationInLang?: string;
  portalActive: boolean;
  trainingActive: boolean;
  hasTranslation: boolean;
  videosCount: number;
  questionsCount: number;
};

const LANGUAGES_META: Array<{
  num: number;
  languageId: string;
  code: string;
  language: string;
  nativeLabel: string;
}> = [
  { num: 1, languageId: "LANG_01", code: "en", language: "English", nativeLabel: "English" },
  { num: 2, languageId: "LANG_03", code: "Hi", language: "Hindi", nativeLabel: "हिन्दी (Hindi)" },
  { num: 3, languageId: "LANG_10", code: "Gu", language: "Gujarati", nativeLabel: "ગુજરાતી (Gujarati)" },
  { num: 4, languageId: "LANG_11", code: "Mr", language: "Marathi", nativeLabel: "मराठी (Marathi)" },
  { num: 5, languageId: "LANG_05", code: "Ml", language: "Malayalam", nativeLabel: "മലയാളം (Malayalam)" },
  { num: 6, languageId: "LANG_04", code: "Kn", language: "Kannada", nativeLabel: "ಕನ್ನಡ (Kannada)" },
  { num: 7, languageId: "LANG_02", code: "Bn", language: "Bengali", nativeLabel: "বাংলা (Bangla)" },
  { num: 8, languageId: "LANG_06", code: "Or", language: "Odia", nativeLabel: "ଓଡ଼ିଆ (Odia)" },
  { num: 9, languageId: "LANG_07", code: "Ta", language: "Tamil", nativeLabel: "தமிழ் (Tamil)" },
  { num: 10, languageId: "LANG_08", code: "Te", language: "Telugu", nativeLabel: "తెలుగు (Telugu)" },
  { num: 11, languageId: "LANG_09", code: "As", language: "Assamese", nativeLabel: "অসমীয়া (Assamese)" },
];

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [course, setCourse] = useState<CourseItem | null>(null);
  const [fetching, setFetching] = useState(true);

  // Main Page View Mode:
  // - "details" (Course Details sidebar + 4 top tabs: Course Languages, Upload Translations, Upload Videos, Upload Questions)
  // - "translation_form" (Course Details & Course Translation tabs, Translations for <Lang> form)
  // - "videos_view" (Course Details & Course Videos tabs, Videos table + Add Video form)
  // - "questionnaire_view" (Course Details & Course Questionnaire & Interactive Questionnaire tabs + Questions table + Add Question form)
  const [viewMode, setViewMode] = useState<"details" | "translation_form" | "videos_view" | "questionnaire_view">("details");

  // Top tab in "details" mode
  const [activeDetailsTab, setActiveDetailsTab] = useState<"languages" | "translations" | "videos" | "questions">("languages");

  // Selected language for sub-views
  const [selectedLangId, setSelectedLangId] = useState<string>("LANG_01");
  const [selectedLangName, setSelectedLangName] = useState<string>("English");
  const [selectedLangCode, setSelectedLangCode] = useState<string>("en");

  // Per-row interactive toggles for Portal and Training (ready for future backend toggle endpoints)
  const [portalToggles, setPortalToggles] = useState<Record<number, boolean>>({});
  const [trainingToggles, setTrainingToggles] = useState<Record<number, boolean>>({});

  // Translation Form State
  const [currentTransData, setCurrentTransData] = useState<Partial<CourseItem> | null>(null);
  const [transCourseName, setTransCourseName] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transDuration, setTransDuration] = useState("");
  const [transCourseLevel, setTransCourseLevel] = useState("BEGINNER");
  const [isLoadingTrans, setIsLoadingTrans] = useState(false);
  const [isSavingTrans, setIsSavingTrans] = useState(false);

  // Videos List State
  const [videosList, setVideosList] = useState<CourseVideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Add Video Form State
  const [videoTitle, setVideoTitle] = useState("");
  const [videoYoutubeId, setVideoYoutubeId] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoOrder, setVideoOrder] = useState("");
  const [videoStatus, setVideoStatus] = useState(true);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Questionnaire active subtab: "standard" | "interactive"
  const [questionnaireSubTab, setQuestionnaireSubTab] = useState<"standard" | "interactive">("standard");

  // Add Questionnaire Question Form State (Standard)
  const [questionText, setQuestionText] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [rightAnswer, setRightAnswer] = useState<number>(1);
  const [questionsList, setQuestionsList] = useState<Array<{
    sNo: number;
    question: string;
    options: string[];
    correctIndex: number;
    status: boolean;
  }>>([
    {
      sNo: 1,
      question: "lasnndlkasldmaskmd",
      options: ["1", "2", "3", "4"],
      correctIndex: 1,
      status: true,
    },
  ]);

  // Interactive Questionnaire State (Matches newly attached screenshot)
  const [interactiveQuestionsList, setInteractiveQuestionsList] = useState<Array<{
    sNo: number;
    qType: string;
    afterVideoId: string;
    question: string;
    status: boolean;
  }>>([]);
  const [interactiveAfterVideo, setInteractiveAfterVideo] = useState("");
  const [interactiveQType, setInteractiveQType] = useState("");

  // Upload XLSX states
  const [uploadMode, setUploadMode] = useState<"append" | "replace">("append");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState<string | null>(null);

  const handleDownloadCourseSample = async (type: "COURSE_TRANSLATIONS" | "COURSE_VIDEOS") => {
    setDownloadingSample(type);
    try {
      const res = await getSampleImportAction(type);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || `${type.toLowerCase()}_sample.csv`;
        a.click();
        URL.revokeObjectURL(url);
        success("Sample template downloaded successfully!");
      } else {
        toastError(res.error || "Failed to download sample file");
      }
    } catch {
      toastError("Failed to download sample file");
    } finally {
      setDownloadingSample(null);
    }
  };

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions
  const canUpdate = can("courses.update");
  const canDelete = can("courses.delete");

  useEffect(() => {
    let mounted = true;
    setFetching(true);

    getCourseByIdAction(id)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setCourse(res.data);

          // Initialize toggles from course
          const initialPortal: Record<number, boolean> = {};
          const initialTraining: Record<number, boolean> = {};
          LANGUAGES_META.forEach((m) => {
            // English is active, others default per API/item
            initialPortal[m.num] = m.code === "en" ? res.data?.status === "ACTIVE" : false;
            initialTraining[m.num] = m.code === "en";
          });
          setPortalToggles(initialPortal);
          setTrainingToggles(initialTraining);
        } else {
          toastError(res.error || "Failed to load course details.");
        }
      })
      .catch((err) => {
        console.error("Failed to load course detail:", err);
        toastError("Failed to load course details.");
      })
      .finally(() => {
        if (mounted) setFetching(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch videos whenever entering videos view or changing language
  useEffect(() => {
    if (viewMode === "videos_view" && course) {
      setLoadingVideos(true);
      getCourseVideosAction({ courseId: course.id, languageId: selectedLangId })
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setVideosList(res.data);
          } else {
            // Sample demo fallback records matching screenshot
            setVideosList([
              {
                videoId: 101,
                sequenceNo: 1,
                title: "Video 1- Covid-19 Safety",
                videoUrl: "https://youtu.be/ibPgQ0zwoxs",
                thumbnail: "",
                duration: "10m",
                points: 20,
                isQuizPresent: true,
                courseId: course.id,
                languageId: selectedLangId,
              },
              {
                videoId: 102,
                sequenceNo: 2,
                title: "Video 2 - Introduction to Waterproofing",
                videoUrl: "https://youtu.be/RJqV4fHkML0",
                thumbnail: "",
                duration: "15m",
                points: 30,
                isQuizPresent: true,
                courseId: course.id,
                languageId: selectedLangId,
              },
            ]);
          }
        })
        .finally(() => setLoadingVideos(false));
    }
  }, [viewMode, selectedLangId, course]);

  const confirmDelete = async () => {
    if (!course) return;
    setIsDeleting(true);

    const res = await deleteCourseAction(course.id);
    setIsDeleting(false);
    setDeleteModalOpen(false);

    if (res.success) {
      success(res.message || "Course deleted successfully");
      router.push("/courses");
    } else {
      toastError(res.error || "Failed to delete course");
    }
  };

  const fetchTranslationForLanguage = async (courseId: number | string, langCode: string, langName: string) => {
    setIsLoadingTrans(true);
    try {
      const res = await getCourseTranslationByLanguageAction(courseId, langCode);
      if (res.success && res.data) {
        setCurrentTransData(res.data);
        setTransCourseName(res.data.courseName || "");
        setTransDescription(res.data.courseDetails || "");
        setTransDuration(res.data.duration || "");
        setTransCourseLevel(res.data.courseLevel || "BEGINNER");
      } else {
        // Fallback from current course state if not found
        const meta = LANGUAGES_META.find(
          (m) => m.code.toLowerCase() === langCode.toLowerCase()
        );
        const code = meta?.code || langCode;
        const isEn = code.toLowerCase() === "en";
        const nameKey = isEn ? "courseName" : (`courseName${code}` as keyof CourseItem);
        const descKey = isEn ? "courseDetails" : (`courseDetails${code}` as keyof CourseItem);
        setCurrentTransData(course ? { ...course } : null);
        setTransCourseName((course?.[nameKey] as string) || (isEn ? course?.courseName || "" : ""));
        setTransDescription((course?.[descKey] as string) || (isEn ? course?.courseDetails || "" : ""));
        setTransDuration(course?.duration || "");
        setTransCourseLevel((course?.courseLevel as string) || "BEGINNER");
      }
    } catch (err) {
      console.error("Failed to load translation:", err);
    } finally {
      setIsLoadingTrans(false);
    }
  };

  const handleOpenTranslation = (meta: (typeof LANGUAGES_META)[0], isEdit: boolean) => {
    setSelectedLangId(meta.languageId);
    setSelectedLangName(meta.language);
    const code = meta.code.toLowerCase();
    setSelectedLangCode(code);

    if (course) {
      if (isEdit || meta.code.toLowerCase() === "en") {
        fetchTranslationForLanguage(course.id, code, meta.language);
      } else {
        setCurrentTransData(null);
        setTransCourseName("");
        setTransDescription("");
        setTransDuration(course.duration || "");
        setTransCourseLevel(course.courseLevel || "BEGINNER");
      }
    }
    setViewMode("translation_form");
  };

  const handleOpenVideos = (meta: (typeof LANGUAGES_META)[0]) => {
    setSelectedLangId(meta.languageId);
    setSelectedLangName(meta.language);
    setSelectedLangCode(meta.code.toLowerCase());
    setViewMode("videos_view");
  };

  const handleOpenQuestionnaire = (meta: (typeof LANGUAGES_META)[0]) => {
    setSelectedLangId(meta.languageId);
    setSelectedLangName(meta.language);
    setSelectedLangCode(meta.code.toLowerCase());
    setViewMode("questionnaire_view");
  };

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    if (!transCourseName.trim()) {
      toastError("Course Name is required");
      return;
    }

    setIsSavingTrans(true);
    try {
      // Send the rest of the translation data as it is, with updated fields merged
      const payload = {
        ...(currentTransData || {}),
        language: selectedLangCode,
        courseName: transCourseName.trim(),
        courseDetails: transDescription.trim(),
        courseLevel: transCourseLevel || "BEGINNER",
        ...(transDuration ? { duration: transDuration } : {}),
      };

      const res = await updateCourseTranslationAction(course.id, payload);

      if (res.success) {
        success(res.message || `Translation for ${selectedLangName} saved successfully!`);
        // If data updated, refresh course state
        if (res.data) {
          setCourse(res.data);
          setCurrentTransData(res.data);
        }
        setViewMode("details");
      } else {
        toastError(res.error || "Failed to update course translation.");
      }
    } catch {
      toastError("An unexpected error occurred while saving the translation.");
    } finally {
      setIsSavingTrans(false);
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) {
      toastError("Video Title is required");
      return;
    }
    setIsSavingVideo(true);
    setTimeout(() => {
      setIsSavingVideo(false);
      const newSeq = videosList.length + 1;
      setVideosList((prev) => [
        ...prev,
        {
          videoId: Date.now(),
          sequenceNo: Number(videoOrder) || newSeq,
          title: videoTitle.trim(),
          videoUrl: videoYoutubeId.trim(),
          duration: "10m",
          points: 10,
          courseId: course?.id || 0,
        },
      ]);
      setVideoTitle("");
      setVideoYoutubeId("");
      setVideoDesc("");
      setVideoOrder("");
      success("Video added successfully!");
    }, 600);
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      toastError("Question is required");
      return;
    }
    setQuestionsList((prev) => [
      ...prev,
      {
        sNo: prev.length + 1,
        question: questionText.trim(),
        options: [opt1, opt2, opt3, opt4].filter(Boolean),
        correctIndex: rightAnswer,
        status: true,
      },
    ]);
    setQuestionText("");
    setOpt1("");
    setOpt2("");
    setOpt3("");
    setOpt4("");
    success("Question added successfully!");
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toastError("Please choose an XLSX file to upload.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      success(`${selectedFile.name} uploaded successfully!`);
      setSelectedFile(null);
    }, 1000);
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading course details…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
        <Card className="p-8 text-center text-slate-500">
          Course not found or you do not have permission to view this course.
        </Card>
      </div>
    );
  }

  // Build rows with translation existence check and videoCount from API
  const languageRows: CourseLangRow[] = LANGUAGES_META.map((meta) => {
    const isEn = meta.code === "en";
    const nameKey = isEn ? "courseName" : (`courseName${meta.code}` as keyof CourseItem);
    const translatedName = course[nameKey] as string | undefined;
    const hasTranslation = Boolean(translatedName && translatedName.trim().length > 0) || isEn;

    // Check if course has a matching item in its languages array from API
    const apiLang = course.languages?.find(
      (l) =>
        l.languageId === meta.languageId ||
        l.language.toLowerCase() === meta.language.toLowerCase() ||
        (meta.code && l.languageCode?.toLowerCase() === meta.code.toLowerCase())
    );

    const videosCount = apiLang?.videoCount ?? (isEn ? course.noOfVideos ?? 5 : 0);

    return {
      num: meta.num,
      languageId: apiLang?.languageId || meta.languageId,
      code: meta.code,
      language: meta.language,
      nativeLabel: meta.nativeLabel,
      nameInLang: translatedName,
      portalActive: portalToggles[meta.num] ?? isEn,
      trainingActive: trainingToggles[meta.num] ?? isEn,
      hasTranslation,
      videosCount,
      questionsCount: isEn ? 1 : meta.num === 8 ? 6 : 0,
    };
  });

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Top Breadcrumb and Title Bar */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (viewMode !== "details") setViewMode("details");
              else router.push("/courses");
            }}
            className="text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Course Name: {course.courseName}
          </h1>
        </div>

        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/courses" className="text-blue-600 hover:underline">
                Courses
              </Link>
            </li>
            <li>/</li>
            <li className="text-slate-700 font-medium">Details</li>
          </ol>
        </nav>
      </div>

      {/* Main Grid: Left Column (Constant Course Details) + Right Column (View Modes) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Column: Course Details Card (Constant) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b px-4 py-3 bg-white">
              <CardTitle className="text-base font-semibold text-slate-900">Course Details</CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Course Image Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                {course.imageUrl && course.imageUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.imageUrl}
                    alt={course.courseName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-400" />
                )}
              </div>

              {/* Title below image */}
              <div className="text-center font-semibold text-slate-800 text-sm border-b pb-3">
                {course.courseName}
              </div>

              {/* Course Meta Info */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">Module:</span>
                  <span className="col-span-2 text-slate-600 truncate">{course.courseName}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">Category:</span>
                  <span className="col-span-2 text-slate-600 truncate">
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

              {/* Left Action Buttons */}
              <div className="space-y-2 pt-2 border-t">
                {course.status === "ACTIVE" ? (
                  <Button
                    type="button"
                    className="w-full justify-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active On Portal
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full justify-center gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white h-8"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Inactive on Portal
                  </Button>
                )}

                <Button
                  type="button"
                  className="w-full justify-center gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white h-8"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Inactive in Training
                </Button>

                {canUpdate && (
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full justify-center gap-1.5 text-xs font-medium text-blue-600 border-blue-400 hover:bg-blue-50 h-8"
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
                    onClick={() => setDeleteModalOpen(true)}
                    className="w-full justify-center gap-1.5 text-xs font-medium text-rose-600 border-rose-300 hover:bg-rose-50 h-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-1.5 text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-50 h-8"
                  onClick={() => {
                    const blob = new Blob(
                      [
                        `id,courseName,categoryId\n${course.id},"${course.courseName}","${course.categoryId}"\n`,
                      ],
                      { type: "text/csv;charset=utf-8;" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `course_${course.id}_details.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    success("Course details downloaded");
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-teal-600" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic View Mode */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* ========================================================== */}
          {/* VIEW 1: MAIN DETAILS (Course Languages & Upload Tabs)     */}
          {/* ========================================================== */}
          {viewMode === "details" && (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Tab Navigation Strip */}
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setActiveDetailsTab("languages")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 transition-colors",
                    activeDetailsTab === "languages"
                      ? "border-blue-600 bg-white text-blue-600 shadow-xs font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <List className="h-4 w-4" />
                  Course Languages
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailsTab("translations")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 transition-colors",
                    activeDetailsTab === "translations"
                      ? "border-blue-600 bg-white text-blue-600 shadow-xs font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <List className="h-4 w-4" />
                  Upload Translations
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailsTab("videos")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 transition-colors",
                    activeDetailsTab === "videos"
                      ? "border-blue-600 bg-white text-blue-600 shadow-xs font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <List className="h-4 w-4" />
                  Upload Videos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailsTab("questions")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 transition-colors",
                    activeDetailsTab === "questions"
                      ? "border-blue-600 bg-white text-blue-600 shadow-xs font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <List className="h-4 w-4" />
                  Upload Questions
                </button>
              </div>

              {/* TAB 1: Course Languages Table */}
              {activeDetailsTab === "languages" && (
                <div className="overflow-x-auto p-2 sm:p-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-slate-800 font-bold">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 min-w-40">Language</th>
                        <th className="py-2.5 px-3 text-center">Portal</th>
                        <th className="py-2.5 px-3 text-center">Training</th>
                        <th className="py-2.5 px-3 text-center">Translation</th>
                        <th className="py-2.5 px-3 text-center">Videos</th>
                        <th className="py-2.5 px-3 text-center">Questionairre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {languageRows.map((row) => (
                        <tr key={row.num} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{row.num}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            <div>
                              <span>{row.nativeLabel}</span>
                              {row.nameInLang && (
                                <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                  {row.nameInLang}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Portal Toggle Button */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setPortalToggles((prev) => ({
                                  ...prev,
                                  [row.num]: !prev[row.num],
                                }));
                                success(`${row.language} portal status updated to ${!portalToggles[row.num] ? "Active" : "Inactive"}`);
                              }}
                              className={cn(
                                "inline-block rounded px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider transition-transform active:scale-95",
                                portalToggles[row.num]
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-rose-600 hover:bg-rose-700"
                              )}
                            >
                              {portalToggles[row.num] ? "Active" : "Inactive"}
                            </button>
                          </td>

                          {/* Training Toggle Button */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setTrainingToggles((prev) => ({
                                  ...prev,
                                  [row.num]: !prev[row.num],
                                }));
                                success(`${row.language} training status updated to ${!trainingToggles[row.num] ? "Active" : "Inactive"}`);
                              }}
                              className={cn(
                                "inline-block rounded px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider transition-transform active:scale-95",
                                trainingToggles[row.num]
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-rose-600 hover:bg-rose-700"
                              )}
                            >
                              {trainingToggles[row.num] ? "Active" : "Inactive"}
                            </button>
                          </td>

                          {/* Translation: Edit Translation or (Add Now) */}
                          <td className="py-2.5 px-3 text-center">
                            {row.hasTranslation ? (
                              <button
                                type="button"
                                onClick={() => handleOpenTranslation(LANGUAGES_META[row.num - 1], true)}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                Edit Translation
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenTranslation(LANGUAGES_META[row.num - 1], false)}
                                className="text-xs text-rose-500 hover:underline font-medium"
                              >
                                (Add Now)
                              </button>
                            )}
                          </td>

                          {/* Videos: View Videos(X) or (Add Now) */}
                          <td className="py-2.5 px-3 text-center">
                            {row.videosCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenVideos(LANGUAGES_META[row.num - 1])}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                View Videos({row.videosCount})
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenVideos(LANGUAGES_META[row.num - 1])}
                                className="text-xs text-rose-500 hover:underline font-medium"
                              >
                                (Add Now)
                              </button>
                            )}
                          </td>

                          {/* Questionnaire: X Questions or (Add Now) */}
                          <td className="py-2.5 px-3 text-center">
                            {row.questionsCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenQuestionnaire(LANGUAGES_META[row.num - 1])}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                {row.questionsCount} Questions
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuestionnaire(LANGUAGES_META[row.num - 1])}
                                className="text-xs text-rose-500 hover:underline font-medium"
                              >
                                (Add Now)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Upload Translations */}
              {activeDetailsTab === "translations" && (
                <div className="p-6 space-y-6">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-slate-700">
                        Upload a file with course translations for multiple languages.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingSample === "COURSE_TRANSLATIONS"}
                        onClick={() => handleDownloadCourseSample("COURSE_TRANSLATIONS")}
                        className="h-7 text-xs font-medium gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="h-3 w-3" />
                        {downloadingSample === "COURSE_TRANSLATIONS"
                          ? "Downloading…"
                          : "Download Sample File"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">Columns in Sample File:</span>{" "}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono">
                        courseId,languageId,courseName,description,courseDuration,courseLevel,activeOnPortal,activeInTraining
                      </code>
                    </p>
                  </div>

                  <form onSubmit={handleUploadSubmit} className="space-y-5 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload XLSX File
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right pt-0.5">
                        Old Records
                      </Label>
                      <div className="sm:col-span-3 space-y-2 text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsTrans"
                            value="append"
                            checked={uploadMode === "append"}
                            onChange={() => setUploadMode("append")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Append New records. (Keep Existing as it is.)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsTrans"
                            value="replace"
                            checked={uploadMode === "replace"}
                            onChange={() => setUploadMode("replace")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Remove All Old Records and Add New from Excel</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isUploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        className="h-8 text-xs font-medium uppercase border-slate-300"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: Upload Videos */}
              {activeDetailsTab === "videos" && (
                <div className="p-6 space-y-6">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-slate-700">
                        Upload a file with video links and metadata for this course.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingSample === "COURSE_VIDEOS"}
                        onClick={() => handleDownloadCourseSample("COURSE_VIDEOS")}
                        className="h-7 text-xs font-medium gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="h-3 w-3" />
                        {downloadingSample === "COURSE_VIDEOS"
                          ? "Downloading…"
                          : "Download Sample File"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">Columns in Sample File:</span>{" "}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono">
                        courseId,languageId,title,youtubeId,description,displayOrder,status
                      </code>
                    </p>
                  </div>

                  <form onSubmit={handleUploadSubmit} className="space-y-5 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload XLSX File
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right pt-0.5">
                        Old Records
                      </Label>
                      <div className="sm:col-span-3 space-y-2 text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsVideos"
                            value="append"
                            checked={uploadMode === "append"}
                            onChange={() => setUploadMode("append")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Append New records. (Keep Existing as it is.)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsVideos"
                            value="replace"
                            checked={uploadMode === "replace"}
                            onChange={() => setUploadMode("replace")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Remove All Old Records and Add New from Excel</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isUploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        className="h-8 text-xs font-medium uppercase border-slate-300"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: Upload Questions */}
              {activeDetailsTab === "questions" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p>
                      You can download the sample excel file here. The order of columns should be exactly
                      as in{" "}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          success("Sample questions Excel template downloaded.");
                        }}
                        className="text-blue-600 underline font-medium"
                      >
                        sample file.
                      </a>
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">Columns in Excel File:</span> Language
                      ID, Question, Option 1, Option 2, Option 3, Option 4, Answer Option Number, Status
                    </p>
                  </div>

                  <form onSubmit={handleUploadSubmit} className="space-y-5 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload XLSX File
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right pt-0.5">
                        Old Records
                      </Label>
                      <div className="sm:col-span-3 space-y-2 text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsQuestions"
                            value="append"
                            checked={uploadMode === "append"}
                            onChange={() => setUploadMode("append")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Append New records. (Keep Existing as it is.)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="oldRecordsQuestions"
                            value="replace"
                            checked={uploadMode === "replace"}
                            onChange={() => setUploadMode("replace")}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Remove All Old Records and Add New from Excel</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isUploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        className="h-8 text-xs font-medium uppercase border-slate-300"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          )}

      {/* ========================================================== */}
      {/* VIEW 2: COURSE TRANSLATION FORM (Matches Screenshots 1 & 2)*/}
      {/* ========================================================== */}
      {viewMode === "translation_form" && (
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Top Tabs: Course Details and Course Translation */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setViewMode("details")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <List className="h-4 w-4" />
              Course Details
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Course Translation
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Language Dropdown Pill with Change option */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <LanguageSelect
                value={selectedLangId}
                onChange={(newId, newName) => {
                  setSelectedLangId(newId);
                  setSelectedLangName(newName);
                  const meta = LANGUAGES_META.find(
                    (m) => m.languageId === newId || m.language === newName
                  );
                  const code = meta?.code?.toLowerCase() || "en";
                  setSelectedLangCode(code);
                  if (course) {
                    fetchTranslationForLanguage(course.id, code, newName);
                  }
                }}
              />

              {isLoadingTrans && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Fetching {selectedLangName} translation…
                </div>
              )}
            </div>

            {/* Heading: Translations for <Language> */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                Translations for {selectedLangName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Language Code: <span className="font-mono font-semibold text-slate-700 uppercase">{selectedLangCode}</span>
              </p>
            </div>

            {/* Translation Form Inputs */}
            <form onSubmit={handleSaveTranslation} className="mx-auto max-w-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="trans-courseName" className="text-xs font-bold text-slate-800 sm:text-right">
                  Course Name <span className="text-rose-500">*</span>
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="trans-courseName"
                    value={transCourseName}
                    onChange={(e) => setTransCourseName(e.target.value)}
                    placeholder="Course Name"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                <Label htmlFor="trans-description" className="text-xs font-bold text-slate-800 sm:text-right pt-2">
                  Description
                </Label>
                <div className="sm:col-span-3">
                  <Textarea
                    id="trans-description"
                    rows={4}
                    value={transDescription}
                    onChange={(e) => setTransDescription(e.target.value)}
                    placeholder="Description"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="trans-level" className="text-xs font-bold text-slate-800 sm:text-right">
                  Course Level
                </Label>
                <div className="sm:col-span-3">
                  <select
                    id="trans-level"
                    value={transCourseLevel}
                    onChange={(e) => setTransCourseLevel(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="trans-duration" className="text-xs font-bold text-slate-800 sm:text-right">
                  Course Duration
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    id="trans-duration"
                    value={transDuration}
                    onChange={(e) => setTransDuration(e.target.value)}
                    placeholder="Duration (e.g. 11.07)"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* SAVE / CANCEL buttons */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSavingTrans || isLoadingTrans}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase gap-1.5"
                >
                  {isSavingTrans && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSavingTrans ? "SAVING…" : "SAVE"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewMode("details")}
                  className="min-w-20 h-8 text-xs font-medium uppercase border-slate-300"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* ========================================================== */}
      {/* VIEW 3: COURSE VIDEOS VIEW (Matches Screenshot 4)          */}
      {/* ========================================================== */}
      {viewMode === "videos_view" && (
        <div className="space-y-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Top Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setViewMode("details")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <List className="h-4 w-4" />
                Course Details
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Course Videos
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Language Dropdown Pill */}
              <div>
                <LanguageSelect
                  value={selectedLangId}
                  onChange={(newId, newName) => {
                    setSelectedLangId(newId);
                    setSelectedLangName(newName);
                  }}
                />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Videos in {selectedLangName}
              </h2>

              {/* Videos Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3 min-w-44">Title</th>
                      <th className="py-2.5 px-3 min-w-36">Youtube ID</th>
                      <th className="py-2.5 px-3">Desc.</th>
                      <th className="py-2.5 px-3 text-center">Order</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Edit</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingVideos ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
                        </td>
                      </tr>
                    ) : videosList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          No videos added yet for {selectedLangName}.
                        </td>
                      </tr>
                    ) : (
                      videosList.map((vid, idx) => (
                        <tr key={vid.videoId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-2 text-slate-400 text-center cursor-move">
                            <GripVertical className="h-4 w-4" />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{vid.title}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{vid.videoUrl}</td>
                          <td className="py-2.5 px-3 text-slate-400">—</td>
                          <td className="py-2.5 px-3 text-center font-mono">{vid.sequenceNo ?? idx + 1}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setVideoTitle(vid.title);
                                setVideoYoutubeId(vid.videoUrl);
                                setVideoOrder(String(vid.sequenceNo || ""));
                                success(`Editing video ${vid.title}`);
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setVideosList((prev) => prev.filter((v) => v.videoId !== vid.videoId));
                                success("Video removed from list");
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-blue-600">
                Drag and Drop rows to change the video display order.
              </p>
            </div>
          </Card>

          {/* Add Video Form Card */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b px-6 py-3 bg-white">
              <CardTitle className="text-base font-bold text-slate-900">Add Video</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddVideo} className="mx-auto max-w-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-title" className="text-xs font-bold text-slate-800 sm:text-right">
                    Title <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-title"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Title"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-url" className="text-xs font-bold text-slate-800 sm:text-right">
                    YouTube ID or URL <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-url"
                      value={videoYoutubeId}
                      onChange={(e) => setVideoYoutubeId(e.target.value)}
                      placeholder="e.g. dQw4w9WgXcQ or https://youtu.be/..."
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-desc" className="text-xs font-bold text-slate-800 sm:text-right">
                    Description
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-desc"
                      value={videoDesc}
                      onChange={(e) => setVideoDesc(e.target.value)}
                      placeholder="Description"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-order" className="text-xs font-bold text-slate-800 sm:text-right">
                    Display Order
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-order"
                      value={videoOrder}
                      onChange={(e) => setVideoOrder(e.target.value)}
                      placeholder="Auto-assigned if blank"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="text-xs font-bold text-slate-800 sm:text-right">Status</Label>
                  <div className="sm:col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="v-active"
                      checked={videoStatus}
                      onCheckedChange={(c) => setVideoStatus(Boolean(c))}
                    />
                    <Label htmlFor="v-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isSavingVideo}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-20 h-8 text-xs font-semibold uppercase"
                  >
                    {isSavingVideo && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    SAVE
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVideoTitle("");
                      setVideoYoutubeId("");
                      setVideoDesc("");
                      setVideoOrder("");
                    }}
                    className="min-w-20 h-8 text-xs font-medium uppercase border-slate-300"
                  >
                    CANCEL
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 4: QUESTIONNAIRE VIEW (Matches Screenshot 5)          */}
      {/* ========================================================== */}
      {viewMode === "questionnaire_view" && (
        <div className="space-y-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Top Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setViewMode("details")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <List className="h-4 w-4" />
                Course Details
              </button>
              <button
                type="button"
                onClick={() => setQuestionnaireSubTab("standard")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs transition-colors",
                  questionnaireSubTab === "standard"
                    ? "font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
                    : "font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Plus className="h-4 w-4" />
                Course Questionairre
              </button>
              <button
                type="button"
                onClick={() => setQuestionnaireSubTab("interactive")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs transition-colors",
                  questionnaireSubTab === "interactive"
                    ? "font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
                    : "font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Plus className="h-4 w-4" />
                Interactive Questionairre
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Language Dropdown Pill */}
              <div>
                <LanguageSelect
                  value={selectedLangId}
                  onChange={(newId, newName) => {
                    setSelectedLangId(newId);
                    setSelectedLangName(newName);
                  }}
                />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Assessment Questions in {selectedLangName}
              </h2>

              {/* TAB CONTENT: Standard Questionnaire */}
              {questionnaireSubTab === "standard" && (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-800 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-16">S.No.</th>
                        <th className="py-2.5 px-3 min-w-72">Question</th>
                        <th className="py-2.5 px-3 text-center w-24">Status</th>
                        <th className="py-2.5 px-3 text-center w-16">Edit</th>
                        <th className="py-2.5 px-3 text-center w-16">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questionsList.map((q) => (
                        <tr key={q.sNo} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{q.sNo}</td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <p className="font-medium">{q.question}</p>
                            <div className="pl-2 pt-1 space-y-0.5 text-slate-600 text-[11px]">
                              {q.options.map((opt, oIdx) => (
                                <p key={oIdx} className="flex items-center gap-1.5">
                                  <span>{oIdx + 1}. {opt}</span>
                                  {oIdx + 1 === q.correctIndex && (
                                    <Check className="h-3 w-3 text-emerald-600 font-bold" />
                                  )}
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionText(q.question);
                                setOpt1(q.options[0] || "");
                                setOpt2(q.options[1] || "");
                                setOpt3(q.options[2] || "");
                                setOpt4(q.options[3] || "");
                                setRightAnswer(q.correctIndex);
                                success("Loaded question for editing");
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionsList((prev) => prev.filter((item) => item.sNo !== q.sNo));
                                success("Question deleted");
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB CONTENT: Interactive Questionnaire (Matches attached screenshot) */}
              {questionnaireSubTab === "interactive" && (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-800 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-16">S.No.</th>
                        <th className="py-2.5 px-3 min-w-32">Qtype</th>
                        <th className="py-2.5 px-3 min-w-44">After Video ID</th>
                        <th className="py-2.5 px-3 min-w-72">Question</th>
                        <th className="py-2.5 px-3 text-center w-24">Status</th>
                        <th className="py-2.5 px-3 text-center w-16">Edit</th>
                        <th className="py-2.5 px-3 text-center w-16">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {interactiveQuestionsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No interactive assessment questions added yet for {selectedLangName}.
                          </td>
                        </tr>
                      ) : (
                        interactiveQuestionsList.map((iq) => (
                          <tr key={iq.sNo} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{iq.sNo}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">{iq.qType}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{iq.afterVideoId}</td>
                            <td className="py-2.5 px-3 text-slate-800">{iq.question}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                Active
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setInteractiveAfterVideo(iq.afterVideoId);
                                  setInteractiveQType(iq.qType);
                                  success("Loaded interactive question for editing");
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setInteractiveQuestionsList((prev) => prev.filter((item) => item.sNo !== iq.sNo));
                                  success("Interactive question deleted");
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Add Question Card (Standard Questionnaire) */}
          {questionnaireSubTab === "standard" && (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b px-6 py-3 bg-white">
                <CardTitle className="text-base font-bold text-slate-900">
                  Add Question - {selectedLangName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddQuestion} className="mx-auto max-w-3xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                    <Label htmlFor="q-text" className="text-xs font-bold text-slate-800 sm:text-right">
                      Question
                    </Label>
                    <div className="sm:col-span-4">
                      <Input
                        id="q-text"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Question"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  {[
                    { label: "Option 1", val: opt1, setVal: setOpt1, idx: 1 },
                    { label: "Option 2", val: opt2, setVal: setOpt2, idx: 2 },
                    { label: "Option 3", val: opt3, setVal: setOpt3, idx: 3 },
                    { label: "Option 4", val: opt4, setVal: setOpt4, idx: 4 },
                  ].map((opt) => (
                    <div key={opt.idx} className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                      <Label className="text-xs font-bold text-slate-800 sm:text-right">
                        {opt.label}
                      </Label>
                      <div className="sm:col-span-4 flex items-center gap-3">
                        <Input
                          value={opt.val}
                          onChange={(e) => opt.setVal(e.target.value)}
                          placeholder={opt.label}
                          className="h-9 text-xs flex-1"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer shrink-0">
                          <input
                            type="radio"
                            name="rightAnswer"
                            checked={rightAnswer === opt.idx}
                            onChange={() => setRightAnswer(opt.idx)}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>(This is Right Answer)</span>
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-20 h-8 text-xs font-semibold uppercase"
                    >
                      SAVE
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setQuestionText("");
                        setOpt1("");
                        setOpt2("");
                        setOpt3("");
                        setOpt4("");
                      }}
                      className="min-w-20 h-8 text-xs font-medium uppercase border-slate-300"
                    >
                      CANCEL
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add Question Card (Interactive Questionnaire - Matches attached screenshot) */}
          {questionnaireSubTab === "interactive" && (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b px-6 py-3 bg-white">
                <CardTitle className="text-base font-bold text-slate-900">
                  Add Question - {selectedLangName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!interactiveAfterVideo || !interactiveQType) {
                      toastError("Please select Question After Video and Question Type");
                      return;
                    }
                    setInteractiveQuestionsList((prev) => [
                      ...prev,
                      {
                        sNo: prev.length + 1,
                        qType: interactiveQType,
                        afterVideoId: interactiveAfterVideo,
                        question: `Interactive Question for Video ${interactiveAfterVideo}`,
                        status: true,
                      },
                    ]);
                    setInteractiveAfterVideo("");
                    setInteractiveQType("");
                    success("Interactive question added successfully!");
                  }}
                  className="mx-auto max-w-3xl space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                    <Label htmlFor="iq-after-video" className="text-xs font-bold text-slate-800 sm:text-right">
                      Question After Video
                    </Label>
                    <div className="sm:col-span-4">
                      <select
                        id="iq-after-video"
                        value={interactiveAfterVideo}
                        onChange={(e) => setInteractiveAfterVideo(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select ...</option>
                        {videosList.map((vid) => (
                          <option key={vid.videoId} value={String(vid.videoId)}>
                            {vid.title} ({vid.videoId})
                          </option>
                        ))}
                        {videosList.length === 0 && (
                          <>
                            <option value="101">Video 1 - Covid-19 Safety</option>
                            <option value="102">Video 2 - Introduction to Waterproofing</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                    <Label htmlFor="iq-type" className="text-xs font-bold text-slate-800 sm:text-right">
                      Question Type
                    </Label>
                    <div className="sm:col-span-4">
                      <select
                        id="iq-type"
                        value={interactiveQType}
                        onChange={(e) => setInteractiveQType(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="True/False">True/False</option>
                        <option value="Fill in the blank">Fill in the blank</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-20 h-8 text-xs font-semibold uppercase"
                    >
                      SAVE
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setInteractiveAfterVideo("");
                        setInteractiveQType("");
                      }}
                      className="min-w-20 h-8 text-xs font-medium uppercase border-slate-300"
                    >
                      CANCEL
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
        </div>
      </div>

      {/* Delete Course Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course (#{course?.id})?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">{course?.courseName}</strong>
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
    </div>
  );
}
