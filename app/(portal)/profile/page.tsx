"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import { updateUserProfileAction } from "@/features/profile/action";
import type { UserProfile } from "@/features/profile/action";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { validateImageFile } from "@/lib/validations";

function EditProfileContent({ savedProfile }: { savedProfile: UserProfile }) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Form draft overrides (untouched fields follow savedProfile; edits stay preserved during refetches)
  const [fullNameOverride, setFullNameOverride] = useState<string | null>(null);
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [mobileOverride, setMobileOverride] = useState<string | null>(null);
  const [departmentOverride, setDepartmentOverride] = useState<string | null>(
    null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const fullName =
    fullNameOverride ??
    [savedProfile.firstName || "", savedProfile.lastName || ""]
      .filter(Boolean)
      .join(" ");
  const email = emailOverride ?? (savedProfile.email || "");
  const mobileNumber = mobileOverride ?? (savedProfile.mobileNumber || "");
  const departmentId =
    departmentOverride ?? (savedProfile.departmentId || "IT_ADMIN");

  const [isPending, startTransition] = useTransition();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        toastError(
          check.error ||
            "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB)."
        );
        e.target.value = "";
        setImageFile(null);
        return;
      }
      setImageFile(file);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = fullName.trim();
    if (!cleanName) {
      toastError("Full Name is required.");
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toastError("Email is required.");
      return;
    }

    const cleanMobile = mobileNumber.trim();
    if (!cleanMobile) {
      toastError("Mobile number is required.");
      return;
    }
    if (cleanMobile.length !== 10) {
      toastError("Mobile number must be exactly 10 digits.");
      return;
    }

    // Split at frontend, after first space, pass in last name
    const spaceIndex = cleanName.indexOf(" ");
    let firstName = cleanName;
    let lastName = "";
    if (spaceIndex !== -1) {
      firstName = cleanName.slice(0, spaceIndex).trim();
      lastName = cleanName.slice(spaceIndex + 1).trim();
    }

    startTransition(async () => {
      let uploadedUrl: string | null = null;
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("path", `profile_image_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            uploadedUrl = uploadRes.data;
          } else {
            toastError(uploadRes.error || "Failed to upload profile picture.");
            return;
          }
        } catch {
          toastError("Failed to upload image file.");
          return;
        }
      }

      // If a new image was uploaded use its url, otherwise retain current saved profilePic (or null)
      const profilePicToSend =
        uploadedUrl === null ? savedProfile.profilePic || null : uploadedUrl;

      const payload = {
        firstName,
        lastName,
        email: cleanEmail,
        departmentId: departmentId || "IT_ADMIN",
        profilePic: profilePicToSend,
        mobileNumber: cleanMobile,
      };

      const res = await updateUserProfileAction(payload);
      if (res.success) {
        if (res.data) {
          // Update the shared profile cache ONLY after clicking Save and receiving a successful API response
          queryClient.setQueryData(queryKeys.profile, res.data);
        }
        // Refresh the user profile across the application (sidebar, navbar)
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        setFullNameOverride(null);
        setEmailOverride(null);
        setMobileOverride(null);
        setDepartmentOverride(null);
        setImageFile(null);
        setFileInputKey((k) => k + 1);
        success(res.message || "User updated successfully");
      } else {
        toastError(res.error || "Failed to update profile.");
      }
    });
  };

  // Derive preview details strictly from savedProfile
  const previewFullName = [savedProfile.firstName, savedProfile.lastName]
    .filter(Boolean)
    .join(" ");
  const previewEmail = savedProfile.email || "";
  const previewDept = savedProfile.departmentId || "";
  const previewPic = savedProfile.profilePic || null;

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Edit Profile"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Edit Profile" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card: Summary & Picture (Independent Preview Card - updates only on successful Save) */}
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-3 p-6 text-center">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
                {previewPic ? (
                  <Image
                    src={previewPic}
                    alt={previewFullName || "Profile"}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewFullName || "User Profile"}
                </h3>
                <p className="truncate text-xs text-slate-500">
                  {previewEmail}
                </p>
                {previewDept && (
                  <span className="mt-1 inline-block rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {previewDept}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Card: Edit Profile Form */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-900">
                User Information
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-1.5 text-slate-600"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
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
                    htmlFor="prof-name"
                    className="text-xs font-semibold text-slate-700 sm:text-right"
                  >
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-name"
                      value={fullName}
                      onChange={(e) => {
                        setFullNameOverride(e.target.value);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="h-9 text-xs"
                      required
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      First name and last name will be split automatically at
                      the first space.
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                  <Label
                    htmlFor="prof-email"
                    className="text-xs font-semibold text-slate-700 sm:text-right"
                  >
                    Email ID <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmailOverride(e.target.value);
                      }}
                      placeholder="Email ID"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                  <Label
                    htmlFor="prof-mobile"
                    className="text-xs font-semibold text-slate-700 sm:text-right"
                  >
                    Mobile <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-mobile"
                      value={mobileNumber}
                      onChange={(e) => {
                        setMobileOverride(
                          e.target.value.replaceAll(/\D/gu, "").slice(0, 10)
                        );
                      }}
                      placeholder="10-digit mobile number"
                      className="h-9 font-mono text-xs"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Department ID */}
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                  <Label
                    htmlFor="prof-dept"
                    className="text-xs font-semibold text-slate-700 sm:text-right"
                  >
                    Department
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-dept"
                      value={departmentId}
                      onChange={(e) => {
                        setDepartmentOverride(e.target.value);
                      }}
                      placeholder="e.g. IT_ADMIN"
                      className="h-9 bg-slate-50 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Profile Picture Upload */}
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                  <Label
                    htmlFor="prof-image"
                    className="text-xs font-semibold text-slate-700 sm:text-right"
                  >
                    Profile Picture
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      key={fileInputKey}
                      id="prof-image"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleImageChange}
                      className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-6">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-8 min-w-28 gap-1.5 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
                  >
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    SAVE CHANGES
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="h-8 min-w-24 border-slate-300 text-xs font-medium uppercase"
                  >
                    <Link href="/dashboard">CANCEL</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const {
    data: savedProfile,
    isLoading: fetching,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) =>
      portalGet<UserProfile>("profile", undefined, signal),
    staleTime: 5 * 60_000,
  });

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading profile details…</p>
      </div>
    );
  }

  if (!savedProfile) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit Profile"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Edit Profile" },
          ]}
        />
        <Card className="space-y-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {isError && error instanceof Error
              ? error.message
              : "Failed to load profile details."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <EditProfileContent
      key={String(savedProfile.id ?? "profile")}
      savedProfile={savedProfile}
    />
  );
}
