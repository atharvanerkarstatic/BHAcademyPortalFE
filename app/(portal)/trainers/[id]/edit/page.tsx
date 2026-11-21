"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, use } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import { updateTrainerAction } from "@/features/trainers/action";
import type { TrainerItem } from "@/features/trainers/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { validateImageFile } from "@/lib/validations";

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

function EditTrainerForm({
  trainerId,
  trainer,
}: {
  trainerId: string;
  trainer: TrainerItem;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [fullNameOverride, setFullNameOverride] = useState<string | null>(null);
  const [pincodeOverride, setPincodeOverride] = useState<string | null>(null);

  const fullName =
    fullNameOverride ??
    [trainer.firstName, trainer.lastName].filter(Boolean).join(" ");
  const pincode = pincodeOverride ?? (trainer.pinCode || trainer.pincode || "");

  const email = trainer.email || "";
  const mobileNumber = trainer.mobileNumber || "";
  const currentProfilePic = trainer.profilePic || null;

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const canUpdate = can("users.update") || can("system.all");

  useEffect(
    () => () => {
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    },
    [newImagePreview]
  );

  const handleImageChange = (file: File | null) => {
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        toastError(
          check.error ||
            "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB)."
        );
        setNewImageFile(null);
        if (newImagePreview) {
          URL.revokeObjectURL(newImagePreview);
          setNewImagePreview(null);
        }
        return;
      }
    }
    setNewImageFile(file);
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
    if (file) {
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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

    const cleanPincode = pincode.replaceAll(/\D/gu, "").slice(0, 6);
    if (!cleanPincode) {
      toastError("Pincode is required.");
      return;
    }

    if (cleanPincode.length !== 6) {
      toastError("Pincode must be exactly 6 digits.");
      return;
    }

    const cleanMobile = mobileNumber.replaceAll(/\D/gu, "");
    if (cleanMobile && cleanMobile.length !== 10) {
      toastError("Mobile number must be exactly 10 digits.");
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
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }

      const { firstName, lastName } = splitName(fullName);

      const res = await updateTrainerAction(trainerId, {
        firstName,
        lastName,
        email: email.trim(),
        mobileNumber: mobileNumber.trim() || undefined,
        pinCode: cleanPincode,
        // Send null for no update, or new generated URL if new file was uploaded
        profilePic: profilePicValue,
      });

      if (res.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.trainers.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
        ]);
        success(res.message || "Trainer updated successfully");
        router.push("/trainers");
      } else {
        toastError(res.error || "Failed to update trainer. Please try again.");
      }
    });
  };

  const avatarPreviewSrc = newImagePreview || currentProfilePic;
  const avatarPreviewAlt = newImagePreview ? "New Preview" : "Current Profile";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Trainer"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainers", href: "/trainers" },
          { label: "Edit Trainer" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Trainer Details
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600"
          >
            <Link href="/trainers">
              <ArrowLeft className="h-4 w-4" />
              Back to Trainers List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Full Name */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-trainer-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullNameOverride(e.target.value);
                  }}
                  placeholder="Full Name"
                  className="h-9 text-xs"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  First word is saved as First Name, remaining words as Last
                  Name.
                </p>
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-trainer-email"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Email Address
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  placeholder="e.g. trainer@example.com"
                  className="h-9 cursor-not-allowed bg-slate-100 text-xs text-slate-500"
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-trainer-pincode"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Pincode <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincodeOverride(
                      e.target.value.replaceAll(/\D/gu, "").slice(0, 6)
                    );
                  }}
                  placeholder="e.g. 245101"
                  maxLength={6}
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number (Read-only) */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-trainer-mobile"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-trainer-mobile"
                  value={mobileNumber}
                  readOnly
                  disabled
                  placeholder="10-digit mobile number"
                  className="h-9 cursor-not-allowed bg-slate-100 font-mono text-xs text-slate-500"
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 items-start gap-4 pt-1 sm:grid-cols-4">
              <Label
                htmlFor="edit-trainer-image"
                className="text-xs font-semibold text-slate-700 sm:pt-2 sm:text-right"
              >
                Profile Picture
              </Label>
              <div className="space-y-2 sm:col-span-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {avatarPreviewSrc ? (
                      <img
                        src={avatarPreviewSrc}
                        alt={avatarPreviewAlt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <Input
                    id="edit-trainer-image"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => {
                      handleImageChange(e.target.files?.[0] || null);
                    }}
                    className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-3 border-t pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 min-w-28 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                UPDATE TRAINER
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.back();
                }}
                className="h-8 min-w-28 border-slate-300 text-xs font-medium uppercase"
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

export default function EditTrainerPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const trainerId = params.id;

  const {
    data: trainer,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.trainers.detail(trainerId),
    queryFn: ({ signal }) =>
      portalGet<TrainerItem>(
        `trainers/${encodeURIComponent(trainerId)}`,
        undefined,
        signal
      ),
    enabled: Boolean(trainerId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit Trainer"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Trainers", href: "/trainers" },
            { label: "Edit Trainer" },
          ]}
        />
        <Card className="space-y-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {isError && error instanceof Error
              ? error.message
              : "Failed to load trainer details."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/trainers">Back to Trainers List</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <EditTrainerForm key={trainer.id} trainerId={trainerId} trainer={trainer} />
  );
}
