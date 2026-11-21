"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { createAccountAction, uploadMediaAction } from "@/features/accounts/action";
import {
  isValidEmail,
  isValidMobileNumber,
  sanitizeMobileNumber,
  sanitizeTextInput,
  validateImageFile,
} from "@/lib/validations";

export default function NewAccountPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailId, setEmailId] = useState("");
  const [pincode, setPincode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("accounts.create");

  const handleReset = () => {
    setName("");
    setMobileNumber("");
    setEmailId("");
    setPincode("");
    setImageFile(null);
    setFormKey((k) => k + 1);
  };

  const handleBack = () => {
    handleReset();
    router.back();
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      return;
    }
    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Invalid image file");
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(name, 255);
    if (!cleanName) {
      toastError("Full Name is required.");
      return;
    }

    const cleanMobile = sanitizeMobileNumber(mobileNumber);
    if (!cleanMobile) {
      toastError("Mobile number is required.");
      return;
    }

    if (!isValidMobileNumber(cleanMobile)) {
      toastError("Mobile number must be exactly 10 digits.");
      return;
    }

    const cleanEmail = sanitizeTextInput(emailId, 255);
    if (!cleanEmail) {
      toastError("Email ID is required.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      toastError("Please enter a valid email address.");
      return;
    }

    const cleanPincode = sanitizeTextInput(pincode, 6);
    if (!cleanPincode) {
      toastError("Pincode is required.");
      return;
    }

    if (cleanPincode.length !== 6) {
      toastError("Pincode must be exactly 6 digits.");
      return;
    }

    startTransition(async () => {
      let imageUrl = "";
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("path", `profile_image_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            imageUrl = uploadRes.data;
          } else {
            console.warn("Image upload warning:", uploadRes.error);
          }
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }

      const payload: Record<string, unknown> = {
        name: cleanName,
        mobileNumber: cleanMobile,
        emailId: cleanEmail,
        image: imageUrl,
        pincode: cleanPincode,
      };

      const res = await createAccountAction(payload);

      if (res.success) {
        success(res.message || "Account created successfully");
        handleReset();
        router.push("/accounts");
      } else {
        toastError(res.error || "Failed to create account");
      }
    });
  };

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Add New Account"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounts", href: "/accounts" }, { label: "Add" }]}
        />
        <Card className="p-8 text-center text-slate-500">
          You do not have permission to create accounts.
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Accounts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: "Add New Account" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Add New Account</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4" />
              Back to Accounts List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form key={formKey} onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                Mobile Number <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-mobile"
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(sanitizeMobileNumber(e.target.value))}
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Email ID */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                Email ID <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-email"
                  type="email"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  placeholder="e.g. rahul.sharma@example.com"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-pincode" className="text-xs font-semibold text-slate-700 sm:text-right">
                Pincode <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replaceAll(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 245101"
                  maxLength={6}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-image" className="text-xs font-semibold text-slate-700 sm:text-right">
                Profile Picture
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-image"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                  className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
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
