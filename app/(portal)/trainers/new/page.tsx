"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { validateImageFile } from "@/lib/validations";
import { uploadMediaAction } from "@/features/accounts/action";
import { createTrainerAction } from "@/features/trainers/action";

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
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("system.all");

  useEffect(() => {
    handleReset();
    return () => {
      handleReset();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);

  const handleImageChange = (file: File | null) => {
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB).");
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
    setMobileNumber("");
    handleImageChange(null);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const cleanMobile = mobileNumber.replace(/\D/g, "");
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
        } catch (err) {
          console.error("Failed to upload image:", err);
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
        roleIds: ["12"],
      });

      if (res.success) {
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

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Add New Trainer</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/trainers">
              <ArrowLeft className="h-4 w-4" />
              Back to Trainers List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form key={formKey} onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="trainer-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Test Trainer"
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
              <Label htmlFor="trainer-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. trainer@example.com"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="trainer-password" className="text-xs font-semibold text-slate-700 sm:text-right">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter initial password"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="trainer-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainer-mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4 pt-1">
              <Label htmlFor="trainer-image" className="text-xs font-semibold text-slate-700 sm:text-right sm:pt-2">
                Profile Picture
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="trainer-image"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                      className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <p className="text-[11px] text-slate-500">Allowed formats: PNG, JPG, JPEG (Max 5 MB)</p>
                  </div>
                </div>
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
                SAVE TRAINER
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="min-w-28 h-8 text-xs font-medium uppercase border-slate-300"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

