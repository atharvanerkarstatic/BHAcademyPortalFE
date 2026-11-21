"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, List, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  createCourseVideoAction,
  deleteCourseVideoAction,
  updateSingleVideoAction,
} from "@/features/courses/action";
import type { CourseVideoItem } from "@/features/courses/action";
import type { CourseItem } from "@/features/courses/types";
import { LanguageSelect } from "@/features/languages/components/language-select";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useCourseWorkspaceStore } from "@/stores/course-workspace-store";

import { resolveSelectedLangCode } from "./course-languages-meta";

interface CourseVideosManagerProps {
  courseId: string;
  course: CourseItem;
}

export function CourseVideosManager({
  courseId,
  course,
}: CourseVideosManagerProps) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const selectedLangName = useCourseWorkspaceStore(
    (state) => state.selectedLangName
  );
  const selectedLangCode = useCourseWorkspaceStore(
    (state) => state.selectedLangCode
  );
  const setSelectedLangId = useCourseWorkspaceStore(
    (state) => state.setSelectedLangId
  );
  const setSelectedLangName = useCourseWorkspaceStore(
    (state) => state.setSelectedLangName
  );
  const setSelectedLangCode = useCourseWorkspaceStore(
    (state) => state.setSelectedLangCode
  );
  const setViewMode = useCourseWorkspaceStore((state) => state.setViewMode);
  const setActiveDetailsTab = useCourseWorkspaceStore(
    (state) => state.setActiveDetailsTab
  );

  const langCodeKey = selectedLangCode || "en";

  const { data: videosList = [], isFetching: loadingVideos } = useQuery({
    queryKey: queryKeys.courses.videos(courseId, langCodeKey),
    queryFn: ({ signal }) =>
      portalGet<Array<CourseVideoItem>>(
        `courses/${encodeURIComponent(courseId)}/videos`,
        { lang: langCodeKey },
        signal
      ),
  });

  const [editingVideoId, setEditingVideoId] = useState<number | string | null>(
    null
  );
  const [videoTitle, setVideoTitle] = useState("");
  const [videoYoutubeId, setVideoYoutubeId] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoPoints, setVideoPoints] = useState<number>(10);
  const [videoIsQuizPresent, setVideoIsQuizPresent] = useState(false);
  const [videoOrder, setVideoOrder] = useState("");
  const [videoStatus, setVideoStatus] = useState<"ACTIVE" | "INACTIVE">(
    "ACTIVE"
  );
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  const [videoToDelete, setVideoToDelete] = useState<CourseVideoItem | null>(
    null
  );
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);

  const resetVideoForm = () => {
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoYoutubeId("");
    setVideoThumbnail("");
    setVideoDuration("");
    setVideoPoints(10);
    setVideoIsQuizPresent(false);
    setVideoOrder("");
    setVideoStatus("ACTIVE");
  };

  const handleReturnToDetails = () => {
    resetVideoForm();
    setViewMode("details");
    setActiveDetailsTab("languages");
  };

  const handleSaveVideo = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      const parsedOrder = Number(videoOrder);
      const newSeq =
        videoOrder.trim() && !Number.isNaN(parsedOrder) && parsedOrder > 0
          ? parsedOrder
          : videosList.length + 1;

      const payload = {
        sequenceNo: newSeq,
        title: videoTitle.trim(),
        videoUrl: videoYoutubeId.trim(),
        thumbnail: videoThumbnail.trim() || undefined,
        duration: videoDuration.trim() || "10m",
        points: videoPoints || 10,
        isQuizPresent: videoIsQuizPresent,
        status: videoStatus,
        courseId: course.id,
        languageId: langCodeKey,
      };

      if (editingVideoId === null) {
        const res = await createCourseVideoAction(
          course.id,
          langCodeKey,
          payload
        );
        if (res.success) {
          success(res.message || "Video added successfully!");
          resetVideoForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.videos(courseId, langCodeKey),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to add video.");
        }
      } else {
        const res = await updateSingleVideoAction(
          course.id,
          langCodeKey,
          editingVideoId,
          payload
        );
        if (res.success) {
          success(res.message || "Video updated successfully!");
          resetVideoForm();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.videos(courseId, langCodeKey),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.courses.detail(courseId),
            }),
          ]);
        } else {
          toastError(res.error || "Failed to update video.");
        }
      }
    } catch (error) {
      console.error("Error saving video:", error);
      toastError("An unexpected error occurred while saving the video.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleConfirmDeleteVideo = async () => {
    if (!videoToDelete) {
      return;
    }
    const targetId = videoToDelete.id || videoToDelete.videoId;
    setIsDeletingVideo(true);
    try {
      const res = await deleteCourseVideoAction(targetId, course.id);
      setVideoToDelete(null);
      if (res.success) {
        if (editingVideoId === targetId) {
          resetVideoForm();
        }
        success(res.message || "Video deleted successfully");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.videos(courseId, langCodeKey),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.courses.detail(courseId),
          }),
        ]);
      } else {
        toastError(res.error || "Failed to delete video");
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
      setVideoToDelete(null);
      toastError("An error occurred while deleting the video");
    } finally {
      setIsDeletingVideo(false);
    }
  };

  const renderVideosTableBody = () => {
    if (loadingVideos) {
      return (
        <tr>
          <td colSpan={10} className="p-6 text-center text-slate-400">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
          </td>
        </tr>
      );
    }

    if (videosList.length === 0) {
      return (
        <tr>
          <td colSpan={10} className="p-6 text-center text-slate-400">
            No videos added yet for {selectedLangName}.
          </td>
        </tr>
      );
    }

    return videosList.map((vid, idx) => (
      <tr
        key={vid.id || vid.videoId || idx}
        className="transition-colors hover:bg-slate-50/80"
      >
        <td className="cursor-move px-2 py-2.5 text-center text-slate-400">
          <GripVertical className="h-4 w-4" />
        </td>
        <td className="px-3 py-2.5 font-mono text-slate-600">
          {vid.id || vid.videoId || "—"}
        </td>
        <td className="px-3 py-2.5 font-medium text-slate-800">
          <div>{vid.title}</div>
          {vid.isQuizPresent && (
            <span className="py-0.2 mt-0.5 inline-block rounded bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">
              Quiz Included
            </span>
          )}
        </td>
        <td
          className="max-w-[200px] truncate px-3 py-2.5 font-mono text-slate-600"
          title={vid.videoUrl}
        >
          {vid.videoUrl}
        </td>
        <td className="px-3 py-2.5 text-center text-slate-600">
          {vid.duration || "—"}
        </td>
        <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
          {vid.points ?? 10}
        </td>
        <td className="px-3 py-2.5 text-center font-mono">
          {vid.sequenceNo ?? idx + 1}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span
            className={cn(
              "inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              String(vid.status).toUpperCase() === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 text-slate-700"
            )}
          >
            {vid.status || "ACTIVE"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
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
              setVideoStatus(
                vid.status && vid.status.toUpperCase() === "INACTIVE"
                  ? "INACTIVE"
                  : "ACTIVE"
              );
              success(`Editing video: ${vid.title}`);
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
              setVideoToDelete(vid);
            }}
            className="text-xs font-medium text-rose-600 hover:underline"
          >
            Delete
          </button>
        </td>
      </tr>
    ));
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
            className="flex items-center gap-2 rounded-t-lg border-t-2 border-blue-600 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Course Videos
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LanguageSelect
              value={langCodeKey}
              showCodeOnly
              onChange={(newId, newName, newCode) => {
                resetVideoForm();
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
            Videos in {selectedLangName}
          </h2>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 font-bold text-slate-800">
                <tr>
                  <th className="w-8 px-3 py-2.5">
                    <span className="sr-only">Reorder</span>
                  </th>
                  <th className="w-16 px-3 py-2.5 font-mono">ID</th>
                  <th className="min-w-44 px-3 py-2.5">Title</th>
                  <th className="min-w-36 px-3 py-2.5">Video URL / YouTube</th>
                  <th className="px-3 py-2.5 text-center">Duration</th>
                  <th className="px-3 py-2.5 text-center">Points</th>
                  <th className="px-3 py-2.5 text-center">Order</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Edit</th>
                  <th className="px-3 py-2.5 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renderVideosTableBody()}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-blue-600">
            Drag and Drop rows to change the video display order.
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              {editingVideoId
                ? `Edit Video - ${selectedLangName}`
                : `Add Video - ${selectedLangName}`}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {editingVideoId
                ? "Modify video details and update the record."
                : `Add a new video in ${selectedLangName} (${langCodeKey.toUpperCase()}) for this course.`}
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
          <form
            onSubmit={(event) => {
              void handleSaveVideo(event);
            }}
            className="mx-auto max-w-2xl space-y-4"
          >
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-title"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Title <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="v-title"
                  value={videoTitle}
                  onChange={(event) => {
                    setVideoTitle(event.target.value);
                  }}
                  placeholder="Title"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-url"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Video URL / YouTube <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="v-url"
                  value={videoYoutubeId}
                  onChange={(event) => {
                    setVideoYoutubeId(event.target.value);
                  }}
                  placeholder="e.g. https://www.youtube.com/watch?v=... or URL"
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-thumbnail"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Thumbnail URL
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="v-thumbnail"
                  value={videoThumbnail}
                  onChange={(event) => {
                    setVideoThumbnail(event.target.value);
                  }}
                  placeholder="https://img.youtube.com/vi/.../0.jpg"
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-duration"
                className="pt-2 text-xs font-bold text-slate-800 sm:text-right"
              >
                Duration
              </Label>
              <div className="space-y-1 sm:col-span-3">
                <Input
                  id="v-duration"
                  value={videoDuration}
                  type="text"
                  onChange={(event) => {
                    setVideoDuration(event.target.value);
                  }}
                  placeholder="e.g. 32.03 mins or 1:20:39 hours"
                  maxLength={100}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Allow decimal values or time formats. E.g.{" "}
                  <span className="font-medium text-slate-700">32.03 mins</span>{" "}
                  or{" "}
                  <span className="font-medium text-slate-700">
                    1:20:39 hours
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-points"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Points
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="v-points"
                  type="number"
                  value={videoPoints}
                  min="0"
                  onChange={(event) => {
                    setVideoPoints(
                      Math.max(0, Math.trunc(Number(event.target.value)) || 0)
                    );
                  }}
                  placeholder="10"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-order"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Sequence / Order
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="v-order"
                  value={videoOrder}
                  onChange={(event) => {
                    setVideoOrder(event.target.value);
                  }}
                  placeholder="Auto-assigned if blank"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-quiz"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Quiz Present
              </Label>
              <div className="flex items-center space-x-2 sm:col-span-3">
                <Checkbox
                  id="v-quiz"
                  checked={videoIsQuizPresent}
                  onCheckedChange={(checked) => {
                    setVideoIsQuizPresent(Boolean(checked));
                  }}
                />
                <Label
                  htmlFor="v-quiz"
                  className="cursor-pointer text-xs font-semibold text-slate-700"
                >
                  Is Quiz Present
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="v-status"
                className="text-xs font-bold text-slate-800 sm:text-right"
              >
                Status
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="v-status"
                  value={videoStatus}
                  onChange={(event) => {
                    setVideoStatus(
                      event.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE"
                    );
                  }}
                  className="border-input focus-visible:ring-ring h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSavingVideo}
                className="h-8 min-w-20 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isSavingVideo && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {editingVideoId ? "UPDATE VIDEO" : "SAVE VIDEO"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetVideoForm}
                className="h-8 min-w-20 border-slate-300 text-xs font-medium uppercase"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(videoToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setVideoToDelete(null);
          }
        }}
        title="Delete Video?"
        description={
          <>
            Are you sure you want to delete this video?
            {videoToDelete?.title ? (
              <>
                <br />
                <strong className="mt-2 line-clamp-2 text-slate-800">
                  {videoToDelete.title}
                </strong>
              </>
            ) : null}
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={handleConfirmDeleteVideo}
        isDeleting={isDeletingVideo}
      />
    </div>
  );
}
