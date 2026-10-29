"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
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
  getCourseVideosByLangAction,
  createCourseVideoAction,
  updateSingleVideoAction,
  deleteCourseVideoAction,
  getCourseQuizzesAction,
  createQuizAction,
  updateQuizAction,
  deleteQuizAction,
  getCourseTranslationByLanguageAction,
  updateCourseTranslationAction,
  importCourseTranslationsAction,
  importCourseVideosAction,
  importCourseQuizzesAction,
  type CourseVideoItem,
  type CourseQuizItem,
  type CreateQuizPayload,
  type CourseImportResponse,
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
  const pathname = usePathname();
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

  // Add/Edit Video Form State
  const [editingVideoId, setEditingVideoId] = useState<number | string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoYoutubeId, setVideoYoutubeId] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoPoints, setVideoPoints] = useState<number>(10);
  const [videoIsQuizPresent, setVideoIsQuizPresent] = useState(false);
  const [videoDesc, setVideoDesc] = useState("");
  const [videoOrder, setVideoOrder] = useState("");
  const [videoStatus, setVideoStatus] = useState(true);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Questionnaire active subtab: "standard" | "interactive"
  const [questionnaireSubTab, setQuestionnaireSubTab] = useState<"standard" | "interactive">("standard");

  // Real backend quiz state
  const [quizzesList, setQuizzesList] = useState<CourseQuizItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | string | null>(null);

  // Add Questionnaire Question Form State (Standard)
  const [questionText, setQuestionText] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [rightAnswer, setRightAnswer] = useState<number>(1);
  const [quizNameInput, setQuizNameInput] = useState("");
  const [quizPointsInput, setQuizPointsInput] = useState<number>(10);
  const [quizVideoIdInput, setQuizVideoIdInput] = useState<string>("");
  const [questionsList, setQuestionsList] = useState<Array<{
    sNo: number;
    question: string;
    options: string[];
    correctIndex: number;
    status: boolean;
  }>>([]);

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

  const [downloadingSample, setDownloadingSample] = useState<string | null>(null);

  // Upload Translations state
  const [uploadCourseId, setUploadCourseId] = useState("");
  const [uploadLangCode, setUploadLangCode] = useState("en");
  const [uploadLangName, setUploadLangName] = useState("English");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isImportingTrans, setIsImportingTrans] = useState(false);

  // Upload Videos state
  const [uploadVideosCourseId, setUploadVideosCourseId] = useState("");
  const [uploadVideosLangCode, setUploadVideosLangCode] = useState("en");
  const [uploadVideosLangName, setUploadVideosLangName] = useState("English");
  const [uploadVideosFile, setUploadVideosFile] = useState<File | null>(null);
  const [isImportingVideos, setIsImportingVideos] = useState(false);

  // Upload Questions state
  const [uploadQuestionsCourseId, setUploadQuestionsCourseId] = useState("");
  const [uploadQuestionsLangCode, setUploadQuestionsLangCode] = useState("en");
  const [uploadQuestionsLangName, setUploadQuestionsLangName] = useState("English");
  const [uploadQuestionsFile, setUploadQuestionsFile] = useState<File | null>(null);
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);

  // File input refs to ensure native DOM file inputs are completely cleared upon upload/cancel
  const transFileInputRef = useRef<HTMLInputElement>(null);
  const videosFileInputRef = useRef<HTMLInputElement>(null);
  const questionsFileInputRef = useRef<HTMLInputElement>(null);

  const resetUploadQuestionsForm = () => {
    setUploadQuestionsFile(null);
    setUploadQuestionsLangCode("en");
    setUploadQuestionsLangName("English");
    if (questionsFileInputRef.current) {
      questionsFileInputRef.current.value = "";
    }
  };

  const resetUploadTranslationsForm = () => {
    setUploadFile(null);
    setUploadLangCode("en");
    setUploadLangName("English");
    if (transFileInputRef.current) {
      transFileInputRef.current.value = "";
    }
  };

  const resetUploadVideosForm = () => {
    setUploadVideosFile(null);
    setUploadVideosLangCode("en");
    setUploadVideosLangName("English");
    if (videosFileInputRef.current) {
      videosFileInputRef.current.value = "";
    }
  };

  const resetTranslationForm = () => {
    setTransCourseName("");
    setTransDescription("");
    setTransDuration("");
    setTransCourseLevel("BEGINNER");
    setCurrentTransData(null);
  };

  const resetQuestionForm = () => {
    setEditingQuizId(null);
    setQuestionText("");
    setOpt1("");
    setOpt2("");
    setOpt3("");
    setOpt4("");
    setRightAnswer(1);
    setQuizNameInput("");
    setQuizVideoIdInput("");
  };

  // Import Dialog State
  const [importResult, setImportResult] = useState<CourseImportResponse | null>(null);
  const [importDialogTitle, setImportDialogTitle] = useState("Import Validation Issues");
  const [importDialogDesc, setImportDialogDesc] = useState("Some rows in your file could not be processed due to validation or mapping issues.");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const handleDownloadCourseSample = async (type: "COURSE_TRANSLATIONS" | "COURSE_VIDEOS" | "QUIZ") => {
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

  // Listen for browser navigation (popstate/pageshow) and route cleanup so no cached tabs persist
  useEffect(() => {
    const handleReset = () => {
      setViewMode("details");
      setActiveDetailsTab("languages");
      setQuestionnaireSubTab("standard");
      resetUploadQuestionsForm();
      resetUploadTranslationsForm();
      resetUploadVideosForm();
      resetTranslationForm();
      resetQuestionForm();
      resetVideoForm();
    };

    window.addEventListener("popstate", handleReset);
    window.addEventListener("pageshow", handleReset);
    return () => {
      window.removeEventListener("popstate", handleReset);
      window.removeEventListener("pageshow", handleReset);
      handleReset();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setFetching(true);
    setViewMode("details");
    setActiveDetailsTab("languages");
    setQuestionnaireSubTab("standard");
    resetVideoForm();

    getCourseByIdAction(id)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setCourse(res.data);

          // Populate default uploadCourseId
          const initialCourseCode = res.data.courseLevel || String(res.data.id || id);
          setUploadCourseId(initialCourseCode);
          setUploadVideosCourseId(initialCourseCode);
          setUploadQuestionsCourseId(initialCourseCode);

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
  const fetchVideosForCurrentView = async () => {
    if (!course) return;
    setLoadingVideos(true);
    try {
      const code = selectedLangCode || "en";
      const res = await getCourseVideosByLangAction(course.id, code);
      if (res.success && res.data) {
        setVideosList(res.data);
      } else {
        // Fallback to post endpoint if language endpoint returns error
        const fallback = await getCourseVideosAction({ courseId: course.id, languageId: selectedLangId });
        if (fallback.success && fallback.data) {
          setVideosList(fallback.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    if (viewMode === "videos_view" && course) {
      fetchVideosForCurrentView();
    }
  }, [viewMode, selectedLangId, selectedLangCode, course]);

  // Fetch quizzes whenever entering questionnaire view or changing language
  const fetchQuizzesForCurrentView = async () => {
    if (!course) return;
    setLoadingQuizzes(true);
    try {
      const code = selectedLangCode || "en";
      const res = await getCourseQuizzesAction(course.id, code);
      if (res.success && res.data) {
        setQuizzesList(res.data);
      } else {
        setQuizzesList([]);
      }
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setQuizzesList([]);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (viewMode === "questionnaire_view" && course) {
      fetchQuizzesForCurrentView();
    }
  }, [viewMode, selectedLangId, selectedLangCode, course]);

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

  const handleOpenTranslation = (meta: (typeof LANGUAGES_META)[0]) => {
    setSelectedLangId(meta.languageId);
    setSelectedLangName(meta.language);
    const code = meta.code.toLowerCase();
    setSelectedLangCode(code);

    if (course) {
      fetchTranslationForLanguage(course.id, code, meta.language);
    }
    setViewMode("translation_form");
  };

  const handleOpenVideos = (meta: (typeof LANGUAGES_META)[0]) => {
    resetVideoForm();
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
        resetTranslationForm();
        setViewMode("details");
        setActiveDetailsTab("languages");
        // Refresh full course data from server so tables and details reflect latest translations
        const fresh = await getCourseByIdAction(id);
        if (fresh.success && fresh.data) {
          setCourse(fresh.data);
        } else if (res.data) {
          setCourse(res.data);
        }
      } else {
        toastError(res.error || "Failed to update course translation.");
      }
    } catch {
      toastError("An unexpected error occurred while saving the translation.");
    } finally {
      setIsSavingTrans(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!videoTitle.trim()) {
      toastError("Video Title is required");
      return;
    }
    if (!videoYoutubeId.trim()) {
      toastError("Video URL or YouTube ID is required");
      return;
    }

    setIsSavingVideo(true);
    try {
      const code = selectedLangCode || "en";
      const newSeq = Number(videoOrder) || (videosList.length + 1);
      const payload = {
        sequenceNo: newSeq,
        title: videoTitle.trim(),
        videoUrl: videoYoutubeId.trim(),
        thumbnail: videoThumbnail.trim() || undefined,
        duration: videoDuration.trim() || "10m",
        points: videoPoints || 10,
        isQuizPresent: videoIsQuizPresent,
        courseId: course.id,
        languageId: code,
      };

      if (editingVideoId) {
        // Edit existing video
        const res = await updateSingleVideoAction(course.id, code, editingVideoId, payload);
        if (res.success) {
          success(res.message || "Video updated successfully!");
          resetVideoForm();
          fetchVideosForCurrentView();
        } else {
          toastError(res.error || "Failed to update video.");
        }
      } else {
        // Create new video
        const res = await createCourseVideoAction(course.id, code, payload);
        if (res.success) {
          success(res.message || "Video added successfully!");
          resetVideoForm();
          fetchVideosForCurrentView();
        } else {
          toastError(res.error || "Failed to add video.");
        }
      }
    } catch (err) {
      console.error("Error saving video:", err);
      toastError("An unexpected error occurred while saving the video.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  const resetVideoForm = () => {
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoYoutubeId("");
    setVideoThumbnail("");
    setVideoDuration("");
    setVideoPoints(10);
    setVideoIsQuizPresent(false);
    setVideoDesc("");
    setVideoOrder("");
    setVideoStatus(true);
  };

  const handleDeleteVideo = async (videoId: number | string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }
    try {
      const res = await deleteCourseVideoAction(videoId, course?.id);
      if (res.success) {
        success(res.message || "Video deleted successfully");
        setVideosList((prev) => prev.filter((v) => (v.id || v.videoId) !== videoId));
      } else {
        toastError(res.error || "Failed to delete video");
      }
    } catch (err) {
      console.error("Failed to delete video:", err);
      toastError("An error occurred while deleting the video");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    if (!questionText.trim()) {
      toastError("Question is required");
      return;
    }
    if (!opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
      toastError("All 4 answer options are required");
      return;
    }

    // Resolve numeric language ID matching whichever language is selected in the dropdown
    let numericLangId: number = 1;
    if (selectedLangId && !isNaN(Number(selectedLangId))) {
      numericLangId = Number(selectedLangId);
    } else {
      const matchedLang = LANGUAGES_META.find(
        (m) =>
          m.languageId === selectedLangId ||
          m.code.toLowerCase() === selectedLangCode.toLowerCase() ||
          m.language.toLowerCase() === selectedLangName.toLowerCase()
      );
      if (matchedLang) {
        numericLangId = matchedLang.num;
      }
    }

    const payload: CreateQuizPayload = {
      question: questionText.trim(),
      answer1: opt1.trim(),
      answer2: opt2.trim(),
      answer3: opt3.trim(),
      answer4: opt4.trim(),
      quizName: course.courseName || "Course Quiz",
      questionType: "MCQ",
      answer1Desc: "",
      answer2Desc: "",
      answer3Desc: "",
      answer4Desc: "",
      answer1Url: "",
      answer2Url: "",
      answer3Url: "",
      answer4Url: "",
      correctAnswer: `answer${rightAnswer}`,
      points: 10,
      assessmentFlag: true,
      quizId: `QUIZ_${course.id}_${Date.now()}`,
      questionImageUrl: "",
      status: "ACTIVE",
      courseId: course.id,
      videoId: null,
      languageId: numericLangId,
    };

    setIsSavingQuiz(true);
    try {
      if (editingQuizId) {
        const res = await updateQuizAction(editingQuizId, payload);
        if (res.success) {
          success(res.message || "Question updated successfully!");
          resetQuestionForm();
          fetchQuizzesForCurrentView();
        } else {
          toastError(res.error || "Failed to update question");
        }
      } else {
        const res = await createQuizAction(payload);
        if (res.success) {
          success(res.message || "Question created successfully!");
          resetQuestionForm();
          fetchQuizzesForCurrentView();
          getCourseByIdAction(id).then((fresh) => {
            if (fresh.success && fresh.data) {
              setCourse(fresh.data);
            }
          });
        } else {
          toastError(res.error || "Failed to create question");
        }
      }
    } catch (err) {
      console.error("Failed to save quiz question:", err);
      toastError("An unexpected error occurred while saving question");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number | string) => {
    if (!window.confirm("Are you sure you want to delete this quiz question?")) {
      return;
    }
    try {
      const res = await deleteQuizAction(quizId, course?.id);
      if (res.success) {
        success(res.message || "Quiz question deleted successfully");
        setQuizzesList((prev) => prev.filter((q) => (q.quizId || q.id) !== quizId));
        if (editingQuizId === quizId) {
          resetQuestionForm();
        }
        getCourseByIdAction(id).then((fresh) => {
          if (fresh.success && fresh.data) {
            setCourse(fresh.data);
          }
        });
      } else {
        toastError(res.error || "Failed to delete quiz question");
      }
    } catch (err) {
      console.error("Failed to delete quiz question:", err);
      toastError("An error occurred while deleting the quiz question");
    }
  };

  const handleImportTranslationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toastError("Please choose a CSV / Excel file to upload.");
      return;
    }

    const effectiveCourseId = course?.id ? String(course.id) : (uploadCourseId.trim() || course?.courseLevel || String(id));
    if (!effectiveCourseId) {
      toastError("Course ID is required.");
      return;
    }

    const effectiveLangCode = uploadLangCode.trim();
    if (!effectiveLangCode) {
      toastError("Language code is required. Please select a language.");
      return;
    }

    setIsImportingTrans(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await importCourseTranslationsAction(effectiveCourseId, effectiveLangCode, formData);
      if (res.success) {
        const data = res.data;
        const hasErrors = data && data.errors && data.errors.length > 0;

        if (hasErrors) {
          setImportDialogTitle("Course Translations Import Issues");
          setImportDialogDesc("Some rows in your translation file could not be processed due to validation or mapping issues.");
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `Course translations imported successfully! (${data?.successCount ?? data?.totalRows ?? 0} rows processed)`
          );
          resetUploadTranslationsForm();
          setActiveDetailsTab("languages");
          setViewMode("details");
          // Reload course details to refresh translation badges / data
          getCourseByIdAction(id).then((fresh) => {
            if (fresh.success && fresh.data) {
              setCourse(fresh.data);
            }
          });
        }
      } else {
        if (res.data && res.data.errors && res.data.errors.length > 0) {
          setImportDialogTitle("Course Translations Import Issues");
          setImportDialogDesc("Some rows in your translation file could not be processed due to validation or mapping issues.");
          setImportResult(res.data);
          setErrorDialogOpen(true);
        }
        toastError(res.error || "Failed to import course translations. Please check file and parameters.");
      }
    } catch {
      toastError("An unexpected error occurred during course translation upload.");
    } finally {
      setIsImportingTrans(false);
    }
  };

  const handleImportVideosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVideosFile) {
      toastError("Please choose a CSV / Excel file to upload.");
      return;
    }

    const effectiveCourseId = course?.id ? String(course.id) : (uploadVideosCourseId.trim() || course?.courseLevel || String(id));
    if (!effectiveCourseId) {
      toastError("Course ID is required.");
      return;
    }

    const effectiveLangCode = uploadVideosLangCode.trim();
    if (!effectiveLangCode) {
      toastError("Language code is required. Please select a language.");
      return;
    }

    setIsImportingVideos(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadVideosFile);

      const res = await importCourseVideosAction(effectiveCourseId, effectiveLangCode, formData);
      if (res.success) {
        const data = res.data;
        const hasErrors = data && data.errors && data.errors.length > 0;

        if (hasErrors) {
          setImportDialogTitle("Course Videos Import Issues");
          setImportDialogDesc("Some rows in your video file could not be processed due to validation or duplicate video issues.");
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `Course videos imported successfully! (${data?.successCount ?? data?.totalRows ?? 0} rows processed)`
          );
          resetUploadVideosForm();
          setActiveDetailsTab("languages");
          setViewMode("details");
          // Reload course details to refresh video counts / badges
          getCourseByIdAction(id).then((fresh) => {
            if (fresh.success && fresh.data) {
              setCourse(fresh.data);
            }
          });
        }
      } else {
        if (res.data && res.data.errors && res.data.errors.length > 0) {
          setImportDialogTitle("Course Videos Import Issues");
          setImportDialogDesc("Some rows in your video file could not be processed due to validation or duplicate video issues.");
          setImportResult(res.data);
          setErrorDialogOpen(true);
        }
        toastError(res.error || "Failed to import course videos. Please check file and parameters.");
      }
    } catch {
      toastError("An unexpected error occurred during course videos upload.");
    } finally {
      setIsImportingVideos(false);
    }
  };

  const handleImportQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadQuestionsFile) {
      toastError("Please choose a CSV / Excel file to upload.");
      return;
    }

    const effectiveCourseId = course?.id ? String(course.id) : (uploadQuestionsCourseId.trim() || course?.courseLevel || String(id));
    if (!effectiveCourseId) {
      toastError("Course ID is required.");
      return;
    }

    const effectiveLangCode = uploadQuestionsLangCode.trim();
    if (!effectiveLangCode) {
      toastError("Language code is required. Please select a language.");
      return;
    }

    setIsImportingQuestions(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadQuestionsFile);

      const res = await importCourseQuizzesAction(effectiveCourseId, effectiveLangCode, formData);
      if (res.success) {
        const data = res.data;
        const hasErrors = data && data.errors && data.errors.length > 0;

        if (hasErrors) {
          setImportDialogTitle("Quiz Questions Import Issues");
          setImportDialogDesc("Some rows in your quiz file could not be processed due to validation or mapping issues.");
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `Quiz questions imported successfully! (${data?.successCount ?? data?.totalRows ?? 0} rows processed)`
          );
          resetUploadQuestionsForm();
          setActiveDetailsTab("languages");
          setViewMode("details");
          // Reload course details to refresh questions count and badges
          getCourseByIdAction(id).then((fresh) => {
            if (fresh.success && fresh.data) {
              setCourse(fresh.data);
            }
          });
          fetchQuizzesForCurrentView();
        }
      } else {
        if (res.data && res.data.errors && res.data.errors.length > 0) {
          setImportDialogTitle("Quiz Questions Import Issues");
          setImportDialogDesc("Some rows in your quiz file could not be processed due to validation or mapping issues.");
          setImportResult(res.data);
          setErrorDialogOpen(true);
        }
        toastError(res.error || "Failed to import quiz questions. Please check file and parameters.");
      }
    } catch {
      toastError("An unexpected error occurred during quiz questions upload.");
    } finally {
      setIsImportingQuestions(false);
    }
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
              resetVideoForm();
              setViewMode("details");
              setActiveDetailsTab("languages");
              router.push("/courses");
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
              <Link
                href="/courses"
                onClick={() => {
                  resetVideoForm();
                  setViewMode("details");
                  setActiveDetailsTab("languages");
                }}
                className="text-blue-600 hover:underline"
              >
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

                          {/* Translation: Edit Translation only */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenTranslation(LANGUAGES_META[row.num - 1])}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Edit Translation
                            </button>
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
                        Upload a CSV / Excel file with course translations for the selected language.
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

                  <form onSubmit={handleImportTranslationsSubmit} className="space-y-5 max-w-2xl">
                    {/* Course Name (Prepopulated, Readonly Context) */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Course
                      </Label>
                      <div className="sm:col-span-3">
                        <div className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800">
                          {course.courseName}
                        </div>
                      </div>
                    </div>

                    {/* Language Picklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Language <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
                        <LanguageSelect
                          value={uploadLangCode}
                          showCodeOnly
                          onChange={(newId, newName, newCode) => {
                            setUploadLangName(newName);
                            const matchedMeta = LANGUAGES_META.find(
                              (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                            );
                            const finalCode = (newCode || matchedMeta?.code || newId).toLowerCase();
                            setUploadLangCode(finalCode);
                          }}
                          buttonClassName="h-9 text-xs bg-slate-900 hover:bg-slate-800"
                        />
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                          <span className="text-slate-500">Selected Code:</span>
                          <span className="font-mono font-bold text-blue-700 uppercase">{uploadLangCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Upload File */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload File (.csv, .xlsx) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          ref={transFileInputRef}
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          required
                        />
                        {uploadFile && (
                          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                            Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isImportingTrans || !uploadFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isImportingTrans && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload Translations
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetUploadTranslationsForm();
                          setActiveDetailsTab("languages");
                          setViewMode("details");
                        }}
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

                  <form onSubmit={handleImportVideosSubmit} className="space-y-5 max-w-2xl">
                    {/* Course Name (Prepopulated, Readonly Context) */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Course
                      </Label>
                      <div className="sm:col-span-3">
                        <div className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800">
                          {course.courseName}
                        </div>
                      </div>
                    </div>

                    {/* Language Picklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Language <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
                        <LanguageSelect
                          value={uploadVideosLangCode}
                          showCodeOnly
                          onChange={(newId, newName, newCode) => {
                            setUploadVideosLangName(newName);
                            const matchedMeta = LANGUAGES_META.find(
                              (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                            );
                            const finalCode = (newCode || matchedMeta?.code || newId).toLowerCase();
                            setUploadVideosLangCode(finalCode);
                          }}
                          buttonClassName="h-9 text-xs bg-slate-900 hover:bg-slate-800"
                        />
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                          <span className="text-slate-500">Selected Code:</span>
                          <span className="font-mono font-bold text-blue-700 uppercase">{uploadVideosLangCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Upload File */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload File (.csv, .xlsx) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          ref={videosFileInputRef}
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={(e) => setUploadVideosFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          required
                        />
                        {uploadVideosFile && (
                          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                            Selected: {uploadVideosFile.name} ({(uploadVideosFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isImportingVideos || !uploadVideosFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isImportingVideos && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload Videos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetUploadVideosForm();
                          setActiveDetailsTab("languages");
                          setViewMode("details");
                        }}
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
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-slate-700">
                        Upload a file with quiz questions and answer options for this course.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingSample === "QUIZ"}
                        onClick={() => handleDownloadCourseSample("QUIZ")}
                        className="h-7 text-xs font-medium gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="h-3 w-3" />
                        {downloadingSample === "QUIZ"
                          ? "Downloading…"
                          : "Download Sample File"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">Columns in Sample File:</span>{" "}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono break-all">
                        video_id,question,answer_1,answer_2,answer_3,answer_4,question_type,answer1_url,answer2_url,answer3_url,answer4_url,correct_answer,points,quiz_name,question_image_url,assessmentFlag,courseId,id,isDeleted,languageId,quizId,status
                      </code>
                    </p>
                  </div>

                  <form onSubmit={handleImportQuestionsSubmit} className="space-y-5 max-w-2xl">
                    {/* Course Context (Prepopulated, Read-only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Course
                      </Label>
                      <div className="sm:col-span-3">
                        <div className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800">
                          {course.courseName}
                        </div>
                      </div>
                    </div>

                    {/* Language Picklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Language <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
                        <LanguageSelect
                          value={uploadQuestionsLangCode}
                          showCodeOnly
                          onChange={(newId, newName, newCode) => {
                            setUploadQuestionsLangName(newName);
                            const matchedMeta = LANGUAGES_META.find(
                              (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                            );
                            const finalCode = (newCode || matchedMeta?.code || newId).toLowerCase();
                            setUploadQuestionsLangCode(finalCode);
                          }}
                          buttonClassName="h-9 text-xs bg-slate-900 hover:bg-slate-800"
                        />
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                          <span className="text-slate-500">Selected Code:</span>
                          <span className="font-mono font-bold text-blue-700 uppercase">{uploadQuestionsLangCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Upload File */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Upload File (.csv, .xlsx, .xls) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          ref={questionsFileInputRef}
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={(e) => setUploadQuestionsFile(e.target.files?.[0] || null)}
                          className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          required
                        />
                        {uploadQuestionsFile && (
                          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                            Selected: {uploadQuestionsFile.name} ({(uploadQuestionsFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:pl-36 pt-2">
                      <Button
                        type="submit"
                        disabled={isImportingQuestions || !uploadQuestionsFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold"
                      >
                        {isImportingQuestions && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Upload Questions
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetUploadQuestionsForm();
                          setActiveDetailsTab("languages");
                          setViewMode("details");
                        }}
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
              onClick={() => {
                resetVideoForm();
                setViewMode("details");
                setActiveDetailsTab("languages");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <List className="h-4 w-4" />
              Course Details
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
            >
              <Pencil className="h-4 w-4" />
              Edit Translation
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Language Dropdown Pill with Change option */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <LanguageSelect
                value={selectedLangCode}
                showCodeOnly
                onChange={(newId, newName, newCode) => {
                  setSelectedLangId(newId);
                  setSelectedLangName(newName);
                  const meta = LANGUAGES_META.find(
                    (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                  );
                  const code = (newCode || meta?.code || "en").toLowerCase();
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
                  onClick={() => {
                    resetTranslationForm();
                    setActiveDetailsTab("languages");
                    setViewMode("details");
                  }}
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
                onClick={() => {
                  resetVideoForm();
                  setViewMode("details");
                  setActiveDetailsTab("languages");
                }}
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <LanguageSelect
                  value={selectedLangCode}
                  showCodeOnly
                  onChange={(newId, newName, newCode) => {
                    resetVideoForm();
                    setSelectedLangId(newId);
                    setSelectedLangName(newName);
                    const meta = LANGUAGES_META.find(
                      (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                    );
                    const code = (newCode || meta?.code || "en").toLowerCase();
                    setSelectedLangCode(code);
                  }}
                />
                <span className="text-xs text-slate-500">
                  Language Code: <strong className="font-mono text-slate-700 uppercase">{selectedLangCode}</strong>
                </span>
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
                      <th className="py-2.5 px-3 w-16 font-mono">ID</th>
                      <th className="py-2.5 px-3 min-w-44">Title</th>
                      <th className="py-2.5 px-3 min-w-36">Video URL / YouTube</th>
                      <th className="py-2.5 px-3 text-center">Duration</th>
                      <th className="py-2.5 px-3 text-center">Points</th>
                      <th className="py-2.5 px-3 text-center">Order</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Edit</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingVideos ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
                        </td>
                      </tr>
                    ) : videosList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          No videos added yet for {selectedLangName}.
                        </td>
                      </tr>
                    ) : (
                      videosList.map((vid, idx) => (
                        <tr key={vid.id || vid.videoId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-2 text-slate-400 text-center cursor-move">
                            <GripVertical className="h-4 w-4" />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{vid.id || vid.videoId || "—"}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            <div>{vid.title}</div>
                            {vid.isQuizPresent && (
                              <span className="inline-block mt-0.5 text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.2 rounded">
                                Quiz Included
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 truncate max-w-[200px]" title={vid.videoUrl}>
                            {vid.videoUrl}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{vid.duration || "—"}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{vid.points ?? 10}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{vid.sequenceNo ?? idx + 1}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn(
                              "inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              String(vid.status).toUpperCase() === "ACTIVE"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            )}>
                              {vid.status || "Active"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVideoId(vid.id || vid.videoId);
                                setVideoTitle(vid.title || "");
                                setVideoYoutubeId(vid.videoUrl || "");
                                setVideoThumbnail(vid.thumbnail || "");
                                setVideoDuration(vid.duration || "");
                                setVideoPoints(vid.points ?? 10);
                                setVideoIsQuizPresent(Boolean(vid.isQuizPresent));
                                setVideoOrder(String(vid.sequenceNo || ""));
                                setVideoStatus(vid.status ? String(vid.status).toUpperCase() === "ACTIVE" : true);
                                success(`Editing video: ${vid.title}`);
                              }}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Edit
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(vid.id || vid.videoId)}
                              className="text-xs text-rose-600 hover:underline font-medium"
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

          {/* Add / Edit Video Form Card */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b px-6 py-3 bg-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  {editingVideoId ? `Edit Video (ID: ${editingVideoId})` : `Add Video - ${selectedLangName}`}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {editingVideoId
                    ? "Modify video details and update the record."
                    : `Add a new video in ${selectedLangName} (${selectedLangCode.toUpperCase()}) for this course.`}
                </CardDescription>
              </div>
              {editingVideoId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetVideoForm}
                  className="h-7 text-xs"
                >
                  + Switch to Add New
                </Button>
              )}
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
                    Video URL / YouTube <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-url"
                      value={videoYoutubeId}
                      onChange={(e) => setVideoYoutubeId(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or URL"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-thumbnail" className="text-xs font-bold text-slate-800 sm:text-right">
                    Thumbnail URL
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-thumbnail"
                      value={videoThumbnail}
                      onChange={(e) => setVideoThumbnail(e.target.value)}
                      placeholder="https://img.youtube.com/vi/.../0.jpg"
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-duration" className="text-xs font-bold text-slate-800 sm:text-right">
                    Duration
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-duration"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      placeholder="e.g. 12:45 or 10m"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-points" className="text-xs font-bold text-slate-800 sm:text-right">
                    Points
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="v-points"
                      type="number"
                      value={videoPoints}
                      onChange={(e) => setVideoPoints(Number(e.target.value) || 0)}
                      placeholder="10"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="v-order" className="text-xs font-bold text-slate-800 sm:text-right">
                    Sequence / Order
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
                  <Label className="text-xs font-bold text-slate-800 sm:text-right">Quiz Present</Label>
                  <div className="sm:col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="v-quiz"
                      checked={videoIsQuizPresent}
                      onCheckedChange={(c) => setVideoIsQuizPresent(Boolean(c))}
                    />
                    <Label htmlFor="v-quiz" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Is Quiz Present
                    </Label>
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
                    {editingVideoId ? "UPDATE VIDEO" : "SAVE VIDEO"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetVideoForm}
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
                onClick={() => {
                  resetVideoForm();
                  setViewMode("details");
                  setActiveDetailsTab("languages");
                }}
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <LanguageSelect
                  value={selectedLangCode}
                  showCodeOnly
                  onChange={(newId, newName, newCode) => {
                    resetVideoForm();
                    setSelectedLangId(newId);
                    setSelectedLangName(newName);
                    const meta = LANGUAGES_META.find(
                      (m) => m.languageId === newId || m.language.toLowerCase() === newName.toLowerCase()
                    );
                    const code = (newCode || meta?.code || "en").toLowerCase();
                    setSelectedLangCode(code);
                  }}
                />
                <span className="text-xs text-slate-500">
                  Language Code: <strong className="font-mono text-slate-700 uppercase">{selectedLangCode}</strong>
                </span>
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
                        <th className="py-2.5 px-3 min-w-28 text-center">Correct Answer</th>
                        <th className="py-2.5 px-3 text-center w-20">Points</th>
                        <th className="py-2.5 px-3 text-center w-24">Status</th>
                        <th className="py-2.5 px-3 text-center w-16">Edit</th>
                        <th className="py-2.5 px-3 text-center w-16">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingQuizzes ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600 mb-2" />
                            Loading quizzes in {selectedLangName}…
                          </td>
                        </tr>
                      ) : quizzesList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No quiz questions found for {selectedLangName}. You can add one below.
                          </td>
                        </tr>
                      ) : (
                        quizzesList.map((q, idx) => {
                          const options = [
                            { key: "answer1", val: q.answer1 },
                            { key: "answer2", val: q.answer2 },
                            { key: "answer3", val: q.answer3 },
                            { key: "answer4", val: q.answer4 },
                          ];
                          const isCorrect = (key: string) =>
                            q.correctAnswer?.toLowerCase() === key.toLowerCase();

                          return (
                            <tr key={q.quizId || q.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3 text-slate-800">
                                <p className="font-semibold text-slate-900">{q.question}</p>
                                <div className="pl-2 pt-1.5 space-y-1 text-slate-600 text-[11px]">
                                  {options.map((opt, oIdx) => (
                                    <p
                                      key={oIdx}
                                      className={cn(
                                        "flex items-center gap-1.5",
                                        isCorrect(opt.key) && "font-semibold text-emerald-700"
                                      )}
                                    >
                                      <span>
                                        {oIdx + 1}. {opt.val}
                                      </span>
                                      {isCorrect(opt.key) && (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      )}
                                    </p>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-700 uppercase">
                                {q.correctAnswer}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                {q.points ?? 10}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={cn(
                                    "inline-block rounded px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider",
                                    q.status?.toUpperCase() === "ACTIVE"
                                      ? "bg-emerald-600"
                                      : "bg-slate-500"
                                  )}
                                >
                                  {q.status || "Active"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const qId = q.quizId ?? q.id;
                                    if (!qId) return;
                                    setEditingQuizId(qId);
                                    setQuestionText(q.question || "");
                                    setOpt1(q.answer1 || "");
                                    setOpt2(q.answer2 || "");
                                    setOpt3(q.answer3 || "");
                                    setOpt4(q.answer4 || "");
                                    const cAns = String(q.correctAnswer || "").toLowerCase();
                                    if (cAns === "answer1" || cAns === String(q.answer1 || "").toLowerCase()) {
                                      setRightAnswer(1);
                                    } else if (cAns === "answer2" || cAns === String(q.answer2 || "").toLowerCase()) {
                                      setRightAnswer(2);
                                    } else if (cAns === "answer3" || cAns === String(q.answer3 || "").toLowerCase()) {
                                      setRightAnswer(3);
                                    } else if (cAns === "answer4" || cAns === String(q.answer4 || "").toLowerCase()) {
                                      setRightAnswer(4);
                                    } else {
                                      setRightAnswer(1);
                                    }
                                    setQuizNameInput(q.quizName || "");
                                    success(`Loaded question ${qId} for editing`);
                                  }}
                                  className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                  Edit
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const qId = q.quizId ?? q.id;
                                    if (qId) handleDeleteQuiz(qId);
                                  }}
                                  className="text-xs text-rose-600 hover:underline font-medium"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
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
                  {editingQuizId
                    ? `Edit Question (ID: ${editingQuizId}) - ${selectedLangName}`
                    : `Add Question - ${selectedLangName}`}
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
                      disabled={isSavingQuiz || loadingQuizzes}
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-20 h-8 text-xs font-semibold uppercase gap-1.5"
                    >
                      {isSavingQuiz && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isSavingQuiz
                        ? (editingQuizId ? "UPDATING…" : "SAVING…")
                        : (editingQuizId ? "UPDATE" : "SAVE")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetQuestionForm}
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
                  Add Interactive Question - {selectedLangName}
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

      {/* Bulk Import Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent size="xl" className="max-h-[85vh] flex flex-col p-6">
          <AlertDialogHeader className="space-y-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-semibold text-slate-900">
                  {importDialogTitle}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500">
                  {importDialogDesc}
                </AlertDialogDescription>
              </div>
            </div>

            {/* Counts Summary Cards */}
            {importResult && (
              <div className="grid grid-cols-3 gap-3 pt-3 w-full">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-slate-500 uppercase">Total Rows</div>
                  <div className="text-lg font-bold text-slate-800">{importResult.totalRows ?? 0}</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-emerald-700 uppercase">Success</div>
                  <div className="text-lg font-bold text-emerald-700">{importResult.successCount ?? 0}</div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-rose-700 uppercase">Failures</div>
                  <div className="text-lg font-bold text-rose-700">{importResult.failureCount ?? importResult.errors?.length ?? 0}</div>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          {/* Errors Table */}
          <div className="flex-1 overflow-y-auto my-3 border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-16">Row #</th>
                  <th className="py-2 px-3 w-28">Identifier</th>
                  <th className="py-2 px-3 w-28">Field</th>
                  <th className="py-2 px-3 w-32">Rejected Value</th>
                  <th className="py-2 px-3">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResult?.errors && importResult.errors.length > 0 ? (
                  importResult.errors.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">
                        {err.rowNumber || "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 truncate max-w-[120px]">
                        {err.identifier || "—"}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {err.field || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-rose-700 truncate max-w-[140px]">
                        {err.rejectedValue !== undefined && err.rejectedValue !== null ? `"${err.rejectedValue}"` : "—"}
                      </td>
                      <td className="py-2 px-3 text-rose-600 font-medium">
                        {err.errorMessage}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No errors to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AlertDialogFooter className="border-t border-slate-100 pt-3">
            <AlertDialogCancel
              onClick={() => {
                setErrorDialogOpen(false);
                setImportResult(null);
              }}
              className="text-xs"
            >
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
