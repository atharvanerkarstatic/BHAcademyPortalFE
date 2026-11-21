"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, List, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { FilePreviewImage } from "@/components/common/file-preview-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import {
  createQuizAction,
  deleteQuizAction,
  updateQuizAction,
} from "@/features/courses/action";
import type {
  CourseQuizItem,
  CourseVideoItem,
  CreateQuizPayload,
} from "@/features/courses/action";
import type { CourseItem } from "@/features/courses/types";
import { LanguageSelect } from "@/features/languages/components/language-select";
import type { LanguageItem } from "@/features/languages/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/validations";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";

import {
  resolveNumericLanguageId,
  resolveSelectedLangCode,
} from "./course-languages-meta";

type InteractiveQuestionType = "True or False" | "Image" | "Pattern";

interface CourseQuizManagerProps {
  courseId: string;
  course: CourseItem;
  allBackendLanguages: ReadonlyArray<LanguageItem>;
}

function parseInteractiveQuestionType(value: string): InteractiveQuestionType {
  if (value === "Image") {
    return "Image";
  }
  if (value === "Pattern") {
    return "Pattern";
  }
  return "True or False";
}

function resolveRightAnswerIndex(quiz: CourseQuizItem): number {
  const normalized = (quiz.correctAnswer || "").toLowerCase();
  if (
    normalized === "answer1" ||
    normalized === (quiz.answer1 || "").toLowerCase()
  ) {
    return 1;
  }
  if (
    normalized === "answer2" ||
    normalized === (quiz.answer2 || "").toLowerCase()
  ) {
    return 2;
  }
  if (
    normalized === "answer3" ||
    normalized === (quiz.answer3 || "").toLowerCase()
  ) {
    return 3;
  }
  if (
    normalized === "answer4" ||
    normalized === (quiz.answer4 || "").toLowerCase()
  ) {
    return 4;
  }
  return 1;
}

function getQuizSubmitLabel(isSaving: boolean, isEditing: boolean): string {
  if (isSaving) {
    return isEditing ? "UPDATING…" : "SAVING…";
  }
  return isEditing ? "UPDATE" : "SAVE";
}

export function CourseQuizManager({
  courseId,
  course,
  allBackendLanguages,
}: CourseQuizManagerProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const questionnaireSubTab = useCourseWorkspaceStore(
    (state) => state.questionnaireSubTab
  );
  const setQuestionnaireSubTab = useCourseWorkspaceStore(
    (state) => state.setQuestionnaireSubTab
  );
  const selectedLangId = useCourseWorkspaceStore(
    (state) => state.selectedLangId
  );
  const setSelectedLangId = useCourseWorkspaceStore(
    (state) => state.setSelectedLangId
  );
  const selectedLangName = useCourseWorkspaceStore(
    (state) => state.selectedLangName
  );
  const setSelectedLangName = useCourseWorkspaceStore(
    (state) => state.setSelectedLangName
  );
  const selectedLangCode = useCourseWorkspaceStore(
    (state) => state.selectedLangCode
  );
  const setSelectedLangCode = useCourseWorkspaceStore(
    (state) => state.setSelectedLangCode
  );
  const setViewMode = useCourseWorkspaceStore((state) => state.setViewMode);
  const setActiveDetailsTab = useCourseWorkspaceStore(
    (state) => state.setActiveDetailsTab
  );

  const langCodeKey = selectedLangCode || "en";

  const { data: videosList = [] } = useQuery({
    queryKey: queryKeys.courses.videos(courseId, langCodeKey),
    queryFn: ({ signal }) =>
      portalGet<Array<CourseVideoItem>>(
        `courses/${encodeURIComponent(courseId)}/videos`,
        { lang: langCodeKey },
        signal
      ),
  });

  const { data: quizzesList = [], isFetching: loadingQuizzes } = useQuery({
    queryKey: queryKeys.courses.quizzes(courseId, langCodeKey, "standard"),
    queryFn: ({ signal }) =>
      portalGet<Array<CourseQuizItem>>(
        `courses/${encodeURIComponent(courseId)}/quizzes`,
        { lang: langCodeKey },
        signal
      ),
  });

  const {
    data: interactiveQuizzesList = [],
    isFetching: loadingInteractiveQuizzes,
  } = useQuery({
    queryKey: queryKeys.courses.quizzes(courseId, langCodeKey, "interactive"),
    queryFn: ({ signal }) =>
      portalGet<Array<CourseQuizItem>>(
        `courses/${encodeURIComponent(courseId)}/quizzes`,
        { lang: langCodeKey, quizType: "interactive" },
        signal
      ),
  });

  // Standard Questionnaire Form State
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | string | null>(
    null
  );
  const [questionText, setQuestionText] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [rightAnswer, setRightAnswer] = useState<number>(1);

  // Interactive Questionnaire Form State
  const [editingInteractiveQuizId, setEditingInteractiveQuizId] = useState<
    number | string | null
  >(null);
  const [isSavingInteractiveQuiz, setIsSavingInteractiveQuiz] = useState(false);
  const [interactiveAfterVideo, setInteractiveAfterVideo] = useState("");
  const [interactiveQType, setInteractiveQType] =
    useState<InteractiveQuestionType>("True or False");
  const [interactiveQuestionText, setInteractiveQuestionText] = useState("");
  const [interactiveRightAnswer, setInteractiveRightAnswer] =
    useState<number>(1);
  const [interactiveOpt1, setInteractiveOpt1] = useState("");
  const [interactiveOpt2, setInteractiveOpt2] = useState("");
  const [interactiveOpt3, setInteractiveOpt3] = useState("");
  const [interactiveOpt4, setInteractiveOpt4] = useState("");
  const [patternImageFile, setPatternImageFile] = useState<File | null>(null);
  const [patternImageUrl, setPatternImageUrl] = useState("");
  const [imageOpt1File, setImageOpt1File] = useState<File | null>(null);
  const [imageOpt1Url, setImageOpt1Url] = useState("");
  const [imageOpt2File, setImageOpt2File] = useState<File | null>(null);
  const [imageOpt2Url, setImageOpt2Url] = useState("");
  const [imageOpt3File, setImageOpt3File] = useState<File | null>(null);
  const [imageOpt3Url, setImageOpt3Url] = useState("");
  const [imageOpt4File, setImageOpt4File] = useState<File | null>(null);
  const [imageOpt4Url, setImageOpt4Url] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  // Delete confirmation state
  const [quizToDelete, setQuizToDelete] = useState<{
    id: number | string;
    question: string;
  } | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);

  const resetQuestionForm = () => {
    setEditingQuizId(null);
    setQuestionText("");
    setOpt1("");
    setOpt2("");
    setOpt3("");
    setOpt4("");
    setRightAnswer(1);
  };

  const resetInteractiveForm = () => {
    setEditingInteractiveQuizId(null);
    setInteractiveAfterVideo("");
    setInteractiveQType("True or False");
    setInteractiveQuestionText("");
    setInteractiveRightAnswer(1);
    setInteractiveOpt1("");
    setInteractiveOpt2("");
    setInteractiveOpt3("");
    setInteractiveOpt4("");
    setPatternImageFile(null);
    setPatternImageUrl("");
    setImageOpt1File(null);
    setImageOpt1Url("");
    setImageOpt2File(null);
    setImageOpt2Url("");
    setImageOpt3File(null);
    setImageOpt3Url("");
    setImageOpt4File(null);
    setImageOpt4Url("");
    setFileInputKey((prev) => prev + 1);
  };

  const handleReturnToDetails = () => {
    resetQuestionForm();
    resetInteractiveForm();
    setViewMode("details");
    setActiveDetailsTab("languages");
  };

  const getResolvedNumericLangId = () =>
    resolveNumericLanguageId({
      selectedLangId,
      selectedLangCode: langCodeKey,
      selectedLangName,
      allBackendLanguages,
      courseLanguages: course.languages,
    });

  const handleAddQuestion = async (
    event: React.SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!questionText.trim()) {
      toastError("Question is required");
      return;
    }
    if (!opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
      toastError("All 4 answer options are required");
      return;
    }

    const numericLangId = getResolvedNumericLangId();

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
      if (editingQuizId === null) {
        const res = await createQuizAction(payload);
        if (res.success) {
          success(res.message || "Question created successfully!");
          resetQuestionForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.quizzes(
                courseId,
                langCodeKey,
                "standard"
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to create question");
        }
      } else {
        const res = await updateQuizAction(editingQuizId, payload);
        if (res.success) {
          success(res.message || "Question updated successfully!");
          resetQuestionForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.quizzes(
                courseId,
                langCodeKey,
                "standard"
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to update question");
        }
      }
    } catch (error) {
      console.error("Failed to save quiz question:", error);
      toastError("An unexpected error occurred while saving question");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) {
      return;
    }
    const targetId = quizToDelete.id;
    setIsDeletingQuiz(true);
    try {
      const res = await deleteQuizAction(targetId, course.id);
      setQuizToDelete(null);
      if (res.success) {
        if (editingQuizId === targetId) {
          resetQuestionForm();
        }
        if (editingInteractiveQuizId === targetId) {
          resetInteractiveForm();
        }
        success(res.message || "Quiz question deleted successfully");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.quizzes(
              courseId,
              langCodeKey,
              "standard"
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.quizzes(
              courseId,
              langCodeKey,
              "interactive"
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.detail(courseId),
          }),
        ]);
      } else {
        toastError(res.error || "Failed to delete quiz question");
      }
    } catch (error) {
      console.error("Failed to delete quiz question:", error);
      setQuizToDelete(null);
      toastError("An error occurred while deleting the quiz question");
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  const uploadQuizImage = async (file: File): Promise<string | null> => {
    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Invalid image file");
      return null;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `quiz_media_${course.id}_${Date.now()}`);
      const res = await uploadMediaAction(formData);
      if (res.success && res.data) {
        return res.data;
      }
      toastError(res.error || "Failed to upload image");
      return null;
    } catch (error) {
      console.error("Image upload exception:", error);
      toastError("Failed to upload image file");
      return null;
    }
  };

  const handleSaveInteractiveQuestion = async (
    event: React.SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!interactiveQuestionText.trim()) {
      toastError("Question text is required");
      return;
    }

    const numericLangId = getResolvedNumericLangId();

    setIsSavingInteractiveQuiz(true);
    try {
      let finalAns1 = "";
      let finalAns2 = "";
      let finalAns3 = "";
      let finalAns4 = "";

      let finalAns1Url = "";
      let finalAns2Url = "";
      let finalAns3Url = "";
      let finalAns4Url = "";
      let finalQuestionImageUrl = "";

      if (interactiveQType === "True or False") {
        finalAns1 = "TRUE";
        finalAns2 = "FALSE";
      } else if (interactiveQType === "Image") {
        finalAns1 = "Option 1";
        finalAns2 = "Option 2";
        finalAns3 = "Option 3";
        finalAns4 = "Option 4";

        finalAns1Url = imageOpt1Url;
        if (imageOpt1File) {
          const uploaded = await uploadQuizImage(imageOpt1File);
          if (!uploaded) {
            return;
          }
          finalAns1Url = uploaded;
        }

        finalAns2Url = imageOpt2Url;
        if (imageOpt2File) {
          const uploaded = await uploadQuizImage(imageOpt2File);
          if (!uploaded) {
            return;
          }
          finalAns2Url = uploaded;
        }

        finalAns3Url = imageOpt3Url;
        if (imageOpt3File) {
          const uploaded = await uploadQuizImage(imageOpt3File);
          if (!uploaded) {
            return;
          }
          finalAns3Url = uploaded;
        }

        finalAns4Url = imageOpt4Url;
        if (imageOpt4File) {
          const uploaded = await uploadQuizImage(imageOpt4File);
          if (!uploaded) {
            return;
          }
          finalAns4Url = uploaded;
        }

        if (!finalAns1Url && !finalAns2Url && !finalAns3Url && !finalAns4Url) {
          toastError("Please upload at least Option 1 and Option 2 images");
          return;
        }
      } else if (interactiveQType === "Pattern") {
        if (
          !interactiveOpt1.trim() ||
          !interactiveOpt2.trim() ||
          !interactiveOpt3.trim() ||
          !interactiveOpt4.trim()
        ) {
          toastError("All 4 answer options are required for Pattern type");
          return;
        }
        finalAns1 = interactiveOpt1.trim();
        finalAns2 = interactiveOpt2.trim();
        finalAns3 = interactiveOpt3.trim();
        finalAns4 = interactiveOpt4.trim();

        finalQuestionImageUrl = patternImageUrl;
        if (patternImageFile) {
          const uploaded = await uploadQuizImage(patternImageFile);
          if (!uploaded) {
            return;
          }
          finalQuestionImageUrl = uploaded;
        }
      }

      const parsedVideoId = interactiveAfterVideo
        ? Number(interactiveAfterVideo)
        : null;
      const resolvedVideoId =
        parsedVideoId !== null && !Number.isNaN(parsedVideoId)
          ? parsedVideoId
          : null;

      const payload: CreateQuizPayload = {
        question: interactiveQuestionText.trim(),
        answer1: finalAns1,
        answer2: finalAns2,
        answer3: finalAns3,
        answer4: finalAns4,
        quizName: course.courseName || "Interactive Quiz",
        questionType: "MCQ",
        answer1Url: finalAns1Url,
        answer2Url: finalAns2Url,
        answer3Url: finalAns3Url,
        answer4Url: finalAns4Url,
        correctAnswer: `answer${interactiveRightAnswer}`,
        points: 10,
        assessmentFlag: true,
        quizId: `QUIZ_${course.id}_${Date.now()}`,
        questionImageUrl: finalQuestionImageUrl,
        status: "ACTIVE",
        courseId: course.id,
        videoId: resolvedVideoId,
        languageId: numericLangId,
      };

      if (editingInteractiveQuizId === null) {
        const res = await createQuizAction(payload);
        if (res.success) {
          success(res.message || "Interactive question created successfully!");
          resetInteractiveForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.quizzes(
                courseId,
                langCodeKey,
                "interactive"
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to create interactive question");
        }
      } else {
        const res = await updateQuizAction(editingInteractiveQuizId, payload);
        if (res.success) {
          success(res.message || "Interactive question updated successfully!");
          resetInteractiveForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.quizzes(
                courseId,
                langCodeKey,
                "interactive"
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to update interactive question");
        }
      }
    } catch (error) {
      console.error("Interactive quiz save error:", error);
      toastError("Failed to save interactive question");
    } finally {
      setIsSavingInteractiveQuiz(false);
    }
  };

  const renderStandardQuizzesBody = () => {
    if (loadingQuizzes) {
      return (
        <tr>
          <td colSpan={7} className="p-8 text-center text-slate-400">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600" />
            Loading quizzes in {selectedLangName}…
          </td>
        </tr>
      );
    }

    if (quizzesList.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="p-8 text-center text-slate-400">
            No quiz questions found for {selectedLangName}. You can add one
            below.
          </td>
        </tr>
      );
    }

    return quizzesList.map((q, idx) => {
      const options = [
        { key: "answer1", val: q.answer1 },
        { key: "answer2", val: q.answer2 },
        { key: "answer3", val: q.answer3 },
        { key: "answer4", val: q.answer4 },
      ];
      const isCorrect = (key: string) =>
        q.correctAnswer?.toLowerCase() === key.toLowerCase();

      return (
        <tr
          key={q.quizId || q.id || idx}
          className="transition-colors hover:bg-slate-50/80"
        >
          <td className="px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
          <td className="px-3 py-2.5 text-slate-800">
            <p className="font-semibold text-slate-900">{q.question}</p>
            <div className="space-y-1 pt-1.5 pl-2 text-[11px] text-slate-600">
              {options.map((opt, oIdx) => (
                <p
                  key={opt.key}
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
          <td className="px-3 py-2.5 text-center font-mono font-medium text-emerald-700 uppercase">
            {q.correctAnswer}
          </td>
          <td className="px-3 py-2.5 text-center font-mono text-slate-700">
            {q.points ?? 10}
          </td>
          <td className="px-3 py-2.5 text-center">
            <span
              className={cn(
                "inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase",
                q.status?.toUpperCase() === "ACTIVE"
                  ? "bg-emerald-600"
                  : "bg-slate-500"
              )}
            >
              {q.status || "ACTIVE"}
            </span>
          </td>
          <td className="px-3 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                const qId = q.quizId ?? q.id;
                if (!qId) {
                  return;
                }
                setEditingQuizId(qId);
                setQuestionText(q.question || "");
                setOpt1(q.answer1 || "");
                setOpt2(q.answer2 || "");
                setOpt3(q.answer3 || "");
                setOpt4(q.answer4 || "");
                setRightAnswer(resolveRightAnswerIndex(q));
                success(`Loaded question ${qId} for editing`);
              }}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Edit
            </button>
          </td>
          <td className="px-3 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                const qId = q.quizId ?? q.id;
                if (qId) {
                  setQuizToDelete({
                    id: qId,
                    question: q.question,
                  });
                }
              }}
              className="text-xs font-medium text-rose-600 hover:underline"
            >
              Delete
            </button>
          </td>
        </tr>
      );
    });
  };

  const renderInteractiveQuizzesBody = () => {
    if (loadingInteractiveQuizzes) {
      return (
        <tr>
          <td colSpan={9} className="p-8 text-center text-slate-400">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600" />
            Loading interactive questions in {selectedLangName}…
          </td>
        </tr>
      );
    }

    if (interactiveQuizzesList.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="p-8 text-center text-slate-400">
            No interactive assessment questions added yet for {selectedLangName}
            .
          </td>
        </tr>
      );
    }

    return interactiveQuizzesList.map((iq, idx) => {
      const isCorrect = (key: string) =>
        iq.correctAnswer?.toLowerCase() === key.toLowerCase();

      const matchedVideo = videosList.find(
        (video) =>
          String(video.videoId) === String(iq.videoId) ||
          String(video.id) === String(iq.videoId)
      );

      const visibleOptions = [
        { key: "answer1", val: iq.answer1, url: iq.answer1Url },
        { key: "answer2", val: iq.answer2, url: iq.answer2Url },
        { key: "answer3", val: iq.answer3, url: iq.answer3Url },
        { key: "answer4", val: iq.answer4, url: iq.answer4Url },
      ].filter((opt) => Boolean(opt.val || opt.url));

      return (
        <tr
          key={iq.quizId || iq.id || idx}
          className="transition-colors hover:bg-slate-50/80"
        >
          <td className="px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
          <td className="px-3 py-2.5">
            {matchedVideo ? (
              <div className="max-w-xs space-y-0.5">
                <p className="truncate font-semibold text-slate-900">
                  {matchedVideo.title}
                </p>
                <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500">
                  ID: {matchedVideo.videoId}
                </span>
              </div>
            ) : (
              <span className="font-mono text-xs text-slate-600">
                {iq.videoName || (iq.videoId ? `Video ${iq.videoId}` : "—")}
              </span>
            )}
          </td>
          <td className="px-3 py-2.5">
            <div className="max-w-md space-y-1">
              <p className="leading-snug font-medium text-slate-900">
                {iq.question}
              </p>
              {iq.questionImageUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={iq.questionImageUrl}
                    alt="Question Media"
                    className="h-10 w-16 rounded border border-slate-200 object-cover"
                  />
                  <a
                    href={iq.questionImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View Image
                  </a>
                </div>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5">
            <div className="space-y-1.5">
              {visibleOptions.map((opt, oIdx) => (
                <div
                  key={opt.key}
                  className={cn(
                    "flex items-center gap-2 text-[11px]",
                    isCorrect(opt.key)
                      ? "font-semibold text-emerald-700"
                      : "text-slate-600"
                  )}
                >
                  <span>{oIdx + 1}.</span>
                  {opt.url ? (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={opt.url}
                        alt={opt.val || `Option ${oIdx + 1}`}
                        className="h-6 w-8 rounded border border-slate-200 object-cover"
                      />
                      <span>{opt.val || `Image Option ${oIdx + 1}`}</span>
                    </div>
                  ) : (
                    <span>{opt.val}</span>
                  )}
                  {isCorrect(opt.key) && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  )}
                </div>
              ))}
            </div>
          </td>
          <td className="px-3 py-2.5 text-center font-mono font-medium text-emerald-700 uppercase">
            {iq.correctAnswer}
          </td>
          <td className="px-3 py-2.5 text-center font-mono text-slate-700">
            {iq.points ?? 10}
          </td>
          <td className="px-3 py-2.5 text-center">
            <span
              className={cn(
                "inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase",
                iq.status?.toUpperCase() === "ACTIVE"
                  ? "bg-emerald-600"
                  : "bg-slate-500"
              )}
            >
              {iq.status || "ACTIVE"}
            </span>
          </td>
          <td className="px-3 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                const qId = iq.quizId ?? iq.id;
                if (!qId) {
                  return;
                }
                setEditingInteractiveQuizId(qId);
                setInteractiveQuestionText(iq.question || "");
                setInteractiveAfterVideo(iq.videoId ? String(iq.videoId) : "");
                setPatternImageFile(null);
                setImageOpt1File(null);
                setImageOpt2File(null);
                setImageOpt3File(null);
                setImageOpt4File(null);
                setFileInputKey((prev) => prev + 1);

                if (iq.answer1Url || iq.answer2Url) {
                  setInteractiveQType("Image");
                  setImageOpt1Url(iq.answer1Url || "");
                  setImageOpt2Url(iq.answer2Url || "");
                  setImageOpt3Url(iq.answer3Url || "");
                  setImageOpt4Url(iq.answer4Url || "");
                  setPatternImageUrl("");
                  setInteractiveOpt1("");
                  setInteractiveOpt2("");
                  setInteractiveOpt3("");
                  setInteractiveOpt4("");
                } else if (iq.questionImageUrl) {
                  setInteractiveQType("Pattern");
                  setPatternImageUrl(iq.questionImageUrl || "");
                  setInteractiveOpt1(iq.answer1 || "");
                  setInteractiveOpt2(iq.answer2 || "");
                  setInteractiveOpt3(iq.answer3 || "");
                  setInteractiveOpt4(iq.answer4 || "");
                  setImageOpt1Url("");
                  setImageOpt2Url("");
                  setImageOpt3Url("");
                  setImageOpt4Url("");
                } else {
                  setInteractiveQType("True or False");
                  setPatternImageUrl("");
                  setImageOpt1Url("");
                  setImageOpt2Url("");
                  setImageOpt3Url("");
                  setImageOpt4Url("");
                  setInteractiveOpt1("");
                  setInteractiveOpt2("");
                  setInteractiveOpt3("");
                  setInteractiveOpt4("");
                }

                setInteractiveRightAnswer(resolveRightAnswerIndex(iq));
                success("Loaded interactive question for editing");
              }}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Edit
            </button>
          </td>
          <td className="px-3 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                const qId = iq.quizId ?? iq.id;
                if (qId) {
                  setQuizToDelete({
                    id: qId,
                    question: iq.question,
                  });
                }
              }}
              className="text-xs font-medium text-rose-600 hover:underline"
            >
              Delete
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50/70 px-2 pt-2 text-sm font-medium">
          <button
            type="button"
            onClick={handleReturnToDetails}
            className="flex items-center gap-2 rounded-t-lg border-t-2 border-transparent px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <List className="h-4 w-4" />
            Course Details
          </button>
          <button
            type="button"
            onClick={() => {
              setQuestionnaireSubTab("standard");
            }}
            className={cn(
              "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs transition-colors",
              questionnaireSubTab === "standard"
                ? "border-t-2 border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                : "border-t-2 border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Plus className="h-4 w-4" />
            Course Questionairre
          </button>
          <button
            type="button"
            onClick={() => {
              setQuestionnaireSubTab("interactive");
            }}
            className={cn(
              "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs transition-colors",
              questionnaireSubTab === "interactive"
                ? "border-t-2 border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                : "border-t-2 border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Plus className="h-4 w-4" />
            Interactive Questionairre
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LanguageSelect
              value={langCodeKey}
              showCodeOnly
              onChange={(newId, newName, newCode) => {
                resetQuestionForm();
                resetInteractiveForm();
                setSelectedLangId(newId);
                setSelectedLangName(newName);
                setSelectedLangCode(
                  resolveSelectedLangCode(newId, newName, newCode)
                );
              }}
            />
            <span className="text-xs text-slate-500">
              Language Code:{" "}
              <strong className="font-mono text-slate-700 uppercase">
                {langCodeKey}
              </strong>
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Assessment Questions in {selectedLangName}
          </h2>

          {questionnaireSubTab === "standard" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 font-bold text-slate-800">
                  <tr>
                    <th className="w-16 px-3 py-2.5">S.No.</th>
                    <th className="min-w-72 px-3 py-2.5">Question</th>
                    <th className="min-w-28 px-3 py-2.5 text-center">
                      Correct Answer
                    </th>
                    <th className="w-20 px-3 py-2.5 text-center">Points</th>
                    <th className="w-24 px-3 py-2.5 text-center">Status</th>
                    <th className="w-16 px-3 py-2.5 text-center">Edit</th>
                    <th className="w-16 px-3 py-2.5 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renderStandardQuizzesBody()}
                </tbody>
              </table>
            </div>
          )}

          {questionnaireSubTab === "interactive" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 font-bold text-slate-800">
                  <tr>
                    <th className="w-16 px-3 py-2.5">S.No.</th>
                    <th className="min-w-28 px-3 py-2.5">Video</th>
                    <th className="min-w-64 px-3 py-2.5">Question</th>
                    <th className="min-w-56 px-3 py-2.5">Options / Image</th>
                    <th className="min-w-24 px-3 py-2.5 text-center">
                      Correct Answer
                    </th>
                    <th className="w-20 px-3 py-2.5 text-center">Points</th>
                    <th className="w-24 px-3 py-2.5 text-center">Status</th>
                    <th className="w-16 px-3 py-2.5 text-center">Edit</th>
                    <th className="w-16 px-3 py-2.5 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renderInteractiveQuizzesBody()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {questionnaireSubTab === "standard" && (
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-white px-6 py-3">
            <CardTitle className="text-base font-bold text-slate-900">
              {editingQuizId
                ? `Edit Question - ${selectedLangName}`
                : `Add Question - ${selectedLangName}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={(event) => {
                void handleAddQuestion(event);
              }}
              className="mx-auto max-w-3xl space-y-4"
            >
              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                <Label
                  htmlFor="q-text"
                  className="text-xs font-bold text-slate-800 sm:text-right"
                >
                  Question
                </Label>
                <div className="sm:col-span-4">
                  <Input
                    id="q-text"
                    value={questionText}
                    onChange={(event) => {
                      setQuestionText(event.target.value);
                    }}
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
                <div
                  key={opt.idx}
                  className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5"
                >
                  <Label
                    htmlFor={`q-opt-${opt.idx}`}
                    className="text-xs font-bold text-slate-800 sm:text-right"
                  >
                    {opt.label}
                  </Label>
                  <div className="flex items-center gap-3 sm:col-span-4">
                    <Input
                      id={`q-opt-${opt.idx}`}
                      value={opt.val}
                      onChange={(event) => {
                        opt.setVal(event.target.value);
                      }}
                      placeholder={opt.label}
                      className="h-9 flex-1 text-xs"
                    />
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="radio"
                        name="rightAnswer"
                        checked={rightAnswer === opt.idx}
                        onChange={() => {
                          setRightAnswer(opt.idx);
                        }}
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
                  className="h-8 min-w-20 gap-1.5 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
                >
                  {isSavingQuiz && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {getQuizSubmitLabel(isSavingQuiz, Boolean(editingQuizId))}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetQuestionForm}
                  className="h-8 min-w-20 border-slate-300 text-xs font-medium uppercase"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {questionnaireSubTab === "interactive" && (
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-white px-6 py-3">
            <CardTitle className="text-base font-bold text-slate-900">
              {editingInteractiveQuizId
                ? `Edit Question - ${selectedLangName}`
                : `Add Question - ${selectedLangName}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={(event) => {
                void handleSaveInteractiveQuestion(event);
              }}
              className="mx-auto max-w-3xl space-y-4"
            >
              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                <Label
                  htmlFor="iq-after-video"
                  className="text-xs font-bold text-slate-800 sm:text-right"
                >
                  Question After Video
                </Label>
                <div className="sm:col-span-4">
                  <select
                    id="iq-after-video"
                    value={interactiveAfterVideo}
                    onChange={(event) => {
                      setInteractiveAfterVideo(event.target.value);
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Video...</option>
                    {videosList.map((vid) => (
                      <option
                        key={vid.videoId || vid.id}
                        value={String(vid.videoId || vid.id)}
                      >
                        {vid.title} (ID: {vid.videoId || vid.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                <Label
                  htmlFor="iq-type"
                  className="text-xs font-bold text-slate-800 sm:text-right"
                >
                  Question Type
                </Label>
                <div className="sm:col-span-4">
                  <select
                    id="iq-type"
                    value={interactiveQType}
                    onChange={(event) => {
                      setInteractiveQType(
                        parseInteractiveQuestionType(event.target.value)
                      );
                      setInteractiveRightAnswer(1);
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="True or False">True or False</option>
                    <option value="Image">Image</option>
                    <option value="Pattern">Pattern</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                <Label
                  htmlFor="iq-question"
                  className="text-xs font-bold text-slate-800 sm:text-right"
                >
                  Question
                </Label>
                <div className="sm:col-span-4">
                  <Input
                    id="iq-question"
                    value={interactiveQuestionText}
                    onChange={(event) => {
                      setInteractiveQuestionText(event.target.value);
                    }}
                    placeholder="Question"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              {interactiveQType === "True or False" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                    <Label
                      htmlFor="iq-tf-opt1"
                      className="text-xs font-bold text-slate-800 sm:text-right"
                    >
                      Option 1
                    </Label>
                    <div className="flex items-center gap-3 sm:col-span-4">
                      <Input
                        id="iq-tf-opt1"
                        value="TRUE"
                        readOnly
                        disabled
                        className="h-9 flex-1 bg-slate-100 text-xs font-bold"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="iqRightAnswer"
                          checked={interactiveRightAnswer === 1}
                          onChange={() => {
                            setInteractiveRightAnswer(1);
                          }}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span>(This is Right Answer)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                    <Label
                      htmlFor="iq-tf-opt2"
                      className="text-xs font-bold text-slate-800 sm:text-right"
                    >
                      Option 2
                    </Label>
                    <div className="flex items-center gap-3 sm:col-span-4">
                      <Input
                        id="iq-tf-opt2"
                        value="FALSE"
                        readOnly
                        disabled
                        className="h-9 flex-1 bg-slate-100 text-xs font-bold"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="iqRightAnswer"
                          checked={interactiveRightAnswer === 2}
                          onChange={() => {
                            setInteractiveRightAnswer(2);
                          }}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span>(This is Right Answer)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {interactiveQType === "Image" && (
                <div className="space-y-3 pt-1">
                  <p className="text-[11px] font-medium text-slate-500 sm:pl-32">
                    Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                  </p>
                  {[
                    {
                      label: "Option 1",
                      file: imageOpt1File,
                      setFile: setImageOpt1File,
                      url: imageOpt1Url,
                      idx: 1,
                    },
                    {
                      label: "Option 2",
                      file: imageOpt2File,
                      setFile: setImageOpt2File,
                      url: imageOpt2Url,
                      idx: 2,
                    },
                    {
                      label: "Option 3",
                      file: imageOpt3File,
                      setFile: setImageOpt3File,
                      url: imageOpt3Url,
                      idx: 3,
                    },
                    {
                      label: "Option 4",
                      file: imageOpt4File,
                      setFile: setImageOpt4File,
                      url: imageOpt4Url,
                      idx: 4,
                    },
                  ].map((opt) => (
                    <div
                      key={opt.idx}
                      className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5"
                    >
                      <Label
                        htmlFor={`iq-img-opt-${opt.idx}`}
                        className="text-xs font-bold text-slate-800 sm:text-right"
                      >
                        {opt.label}
                      </Label>
                      <div className="flex items-center gap-3 sm:col-span-4">
                        <div className="flex flex-1 items-center gap-2">
                          <Input
                            id={`iq-img-opt-${opt.idx}`}
                            key={`img-opt-${opt.idx}-${fileInputKey}`}
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              if (file) {
                                const check = validateImageFile(file);
                                if (!check.valid) {
                                  toastError(
                                    check.error ||
                                      "Only .png, .jpg, and .jpeg are allowed"
                                  );
                                  event.target.value = "";
                                  return;
                                }
                              }
                              opt.setFile(file);
                            }}
                            className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          />
                          {(opt.file || opt.url) && (
                            <div className="h-9 w-12 shrink-0 overflow-hidden rounded border border-slate-200">
                              <FilePreviewImage
                                file={opt.file}
                                fallbackUrl={opt.url}
                                alt={opt.label}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                          <input
                            type="radio"
                            name="iqRightAnswer"
                            checked={interactiveRightAnswer === opt.idx}
                            onChange={() => {
                              setInteractiveRightAnswer(opt.idx);
                            }}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>(This is Right Answer)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {interactiveQType === "Pattern" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5">
                    <Label
                      htmlFor="iq-pattern-img"
                      className="text-xs font-bold text-slate-800 sm:text-right"
                    >
                      Image/Pattern
                    </Label>
                    <div className="flex items-center gap-2 sm:col-span-4">
                      <Input
                        key={`pattern-img-${fileInputKey}`}
                        id="iq-pattern-img"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          if (file) {
                            const check = validateImageFile(file);
                            if (!check.valid) {
                              toastError(
                                check.error ||
                                  "Only .png, .jpg, and .jpeg are allowed"
                              );
                              event.target.value = "";
                              return;
                            }
                          }
                          setPatternImageFile(file);
                        }}
                        className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                      />
                      {(patternImageFile || patternImageUrl) && (
                        <div className="h-9 w-12 shrink-0 overflow-hidden rounded border border-slate-200">
                          <FilePreviewImage
                            file={patternImageFile}
                            fallbackUrl={patternImageUrl}
                            alt="Pattern"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-4 sm:col-start-2">
                      <p className="text-[11px] text-slate-500">
                        Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                      </p>
                    </div>
                  </div>

                  {[
                    {
                      label: "Option 1",
                      val: interactiveOpt1,
                      setVal: setInteractiveOpt1,
                      idx: 1,
                    },
                    {
                      label: "Option 2",
                      val: interactiveOpt2,
                      setVal: setInteractiveOpt2,
                      idx: 2,
                    },
                    {
                      label: "Option 3",
                      val: interactiveOpt3,
                      setVal: setInteractiveOpt3,
                      idx: 3,
                    },
                    {
                      label: "Option 4",
                      val: interactiveOpt4,
                      setVal: setInteractiveOpt4,
                      idx: 4,
                    },
                  ].map((opt) => (
                    <div
                      key={opt.idx}
                      className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5"
                    >
                      <Label
                        htmlFor={`iq-pattern-opt-${opt.idx}`}
                        className="text-xs font-bold text-slate-800 sm:text-right"
                      >
                        {opt.label}
                      </Label>
                      <div className="flex items-center gap-3 sm:col-span-4">
                        <Input
                          id={`iq-pattern-opt-${opt.idx}`}
                          value={opt.val}
                          onChange={(event) => {
                            opt.setVal(event.target.value);
                          }}
                          placeholder={opt.label}
                          className="h-9 flex-1 text-xs"
                          required
                        />
                        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                          <input
                            type="radio"
                            name="iqRightAnswer"
                            checked={interactiveRightAnswer === opt.idx}
                            onChange={() => {
                              setInteractiveRightAnswer(opt.idx);
                            }}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>(This is Right Answer)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={
                    isSavingInteractiveQuiz || loadingInteractiveQuizzes
                  }
                  className="h-8 min-w-20 gap-1.5 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
                >
                  {isSavingInteractiveQuiz && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {getQuizSubmitLabel(
                    isSavingInteractiveQuiz,
                    Boolean(editingInteractiveQuizId)
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetInteractiveForm}
                  className="h-8 min-w-20 border-slate-300 text-xs font-medium uppercase"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={Boolean(quizToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setQuizToDelete(null);
          }
        }}
        title="Delete Quiz Question?"
        description={
          <>
            Are you sure you want to delete this quiz question?
            {quizToDelete?.question ? (
              <>
                <br />
                <strong className="mt-2 line-clamp-2 text-slate-800">
                  {quizToDelete.question}
                </strong>
              </>
            ) : null}
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={handleConfirmDeleteQuiz}
        isDeleting={isDeletingQuiz}
      />
    </div>
  );
}
