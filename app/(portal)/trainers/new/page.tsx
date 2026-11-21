"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import { createTrainerAction } from "@/features/trainers/action";
import { useAuth } from "@/lib/auth-context";
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

export default function NewTrainerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pincode, setPincode] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("system.all");

  useEffect(
    () => () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    },
    [imagePreview]
  );

  const handleImageChange = (file: File | null) => {
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        toastError(
          check.error ||
            "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB)."
        );
        setImageFile(null);
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
          setImagePreview(null);
        }
        return;
      }
    }
    setImageFile(file);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPincode("");
    setMobileNumber("");
    handleImageChange(null);
    setFormKey((k) => k + 1);
  };

  const handleBack = () => {
    handleReset();
    router.back();
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canCreate) {
      toastError("You do not have permission to create trainers.");
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

    if (!password.trim()) {
      toastError("Password is required.");
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
      let profilePicUrl = "";

      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("path", `profile_image_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            profilePicUrl = uploadRes.data;
          } else {
            console.warn("Image upload warning:", uploadRes.error);
          }
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }

      const { firstName, lastName } = splitName(fullName);

      const res = await createTrainerAction({
        firstName,
        lastName,
        email: email.trim(),
        password: password.trim(),
        mobileNumber: cleanMobile || undefined,
        profilePic: profilePicUrl || undefined,
        pinCode: cleanPincode,
      });

      if (res.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.trainers.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
        ]);
        success(res.message || "Trainer created successfully");
        handleReset();
        router.push("/trainers");
      } else {
        toastError(res.error || "Failed to create trainer. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Trainer"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainers", href: "/trainers" },
          { label: "Add Trainer" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Trainer
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
            key={formKey}
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Full Name */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="trainer-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                  }}
                  placeholder="e.g. Test Trainer"
                  className="h-9 text-xs"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  First word is saved as First Name, remaining words as Last
                  Name.
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="trainer-email"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder="e.g. trainer@example.com"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="trainer-password"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  placeholder="Enter initial password"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="trainer-pincode"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Pincode <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(
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

            {/* Mobile Number */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="trainer-mobile"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-mobile"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(
                      e.target.value.replaceAll(/\D/gu, "").slice(0, 10)
                    );
                  }}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 items-start gap-4 pt-1 sm:grid-cols-4">
              <Label
                htmlFor="trainer-image"
                className="text-xs font-semibold text-slate-700 sm:pt-2 sm:text-right"
              >
                Profile Picture
              </Label>
              <div className="space-y-2 sm:col-span-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="trainer-image"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => {
                        handleImageChange(e.target.files?.[0] || null);
                      }}
                      className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <p className="text-[11px] text-slate-500">
                      Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                    </p>
                  </div>
                </div>
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
                SAVE TRAINER
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
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
