"use client";

import { useEffect, useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { uploadMediaAction } from "@/features/accounts/action";
import { getTrainerByIdAction, updateTrainerAction } from "@/features/trainers/action";
import type { TrainerItem } from "@/features/trainers/types";

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const firstSpaceIdx = trimmed.indexOf(" ");
  if (firstSpaceIdx === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, firstSpaceIdx).trim(),
    lastName: trimmed.slice(firstSpaceIdx + 1).trim(),
  };
}

export default function EditTrainerPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const trainerId = params.id;

  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [trainer, setTrainer] = useState<TrainerItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [currentProfilePic, setCurrentProfilePic] = useState<string | null>(null);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const canUpdate = can("users.update") || can("system.all");

  useEffect(() => {
    let active = true;

    async function loadTrainer() {
      setLoadingInitial(true);
      const res = await getTrainerByIdAction(trainerId);
      if (!active) return;

      if (res.success && res.data) {
        const t = res.data;
        setTrainer(t);
        const name = [t.firstName, t.lastName].filter(Boolean).join(" ");
        setFullName(name);
        setEmail(t.email || "");
        setMobileNumber(t.mobileNumber || "");
        setDepartmentId(t.departmentId || "");
        setCurrentProfilePic(t.profilePic || null);
      } else {
        toastError(res.error || "Failed to load trainer details");
      }
      setLoadingInitial(false);
    }

    loadTrainer();

    return () => {
      active = false;
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [trainerId]);

  const handleImageChange = (file: File | null) => {
    setNewImageFile(file);
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
    if (file) {
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canUpdate) {
      toastError("You do not have permission to update trainers.");
      return;
    }

    if (!fullName.trim()) {
      toastError("Full Name is required.");
      return;
    }

    if (!email.trim()) {
      toastError("Email is required.");
      return;
    }

    startTransition(async () => {
      let profilePicValue: string | null = null;

      if (newImageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", newImageFile);
          uploadFormData.append("path", `profile_image_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            profilePicValue = uploadRes.data;
          } else {
            console.warn("Image upload warning:", uploadRes.error);
          }
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      }

      const { firstName, lastName } = splitName(fullName);

      const res = await updateTrainerAction(trainerId, {
        firstName,
        lastName,
        email: email.trim(),
        departmentId: departmentId.trim() || null,
        mobileNumber: mobileNumber.trim() || undefined,
        // Send null for no update, or new generated URL if new file was uploaded
        profilePic: profilePicValue,
      });

      if (res.success) {
        success(res.message || "Trainer updated successfully");
        router.push("/trainers");
      } else {
        toastError(res.error || "Failed to update trainer. Please try again.");
      }
    });
  };

  if (loadingInitial) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Trainer"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainers", href: "/trainers" },
          { label: `Edit Trainer #${trainerId}` },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Trainer Details
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/trainers">
              <ArrowLeft className="h-4 w-4" />
              Back to Trainers List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trainer-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="h-9 text-xs"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  First word is saved as First Name, remaining words as Last Name.
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trainer-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. trainer@example.com"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trainer-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Department ID */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trainer-dept" className="text-xs font-semibold text-slate-700 sm:text-right">
                Department ID
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-dept"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  placeholder="e.g. Training Dept"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4 pt-1">
              <Label htmlFor="edit-trainer-image" className="text-xs font-semibold text-slate-700 sm:text-right sm:pt-2">
                Profile Picture
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {newImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={newImagePreview} alt="New Preview" className="h-full w-full object-cover" />
                    ) : currentProfilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentProfilePic} alt="Current Profile" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <Input
                    id="edit-trainer-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Select a new image file to update profile picture, or leave empty to keep existing image.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t mt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                UPDATE TRAINER
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="min-w-28 h-8 text-xs font-medium uppercase border-slate-300"
              >
                <Link href="/trainers">CANCEL</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

