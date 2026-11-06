"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, User } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { validateImageFile } from "@/lib/validations";
import { uploadMediaAction } from "@/features/accounts/action";
import { getCurrentUserProfile, updateUserProfileAction, type UserProfile } from "@/features/profile/action";
import { useAuth } from "@/lib/auth-context";

export default function EditProfilePage() {
  const { success, error: toastError } = useToast();
  const { refreshProfile } = useAuth();
  
  // Confirmed Saved Profile state (drives the left preview card independently of unsaved form edits)
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  // Form input states (editable form inputs)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("IT_ADMIN");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setFetching(true);
      const res = await getCurrentUserProfile();
      if (!mounted) return;

      if (res.success && res.data) {
        setSavedProfile(res.data);
        const nameParts = [res.data.firstName || "", res.data.lastName || ""].filter(Boolean);
        setFullName(nameParts.join(" "));
        setEmail(res.data.email || "");
        setMobileNumber(res.data.mobileNumber || "");
        setDepartmentId(res.data.departmentId || "IT_ADMIN");
      } else {
        toastError(res.error || "Failed to load profile details.");
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB).");
        e.target.value = "";
        setImageFile(null);
        return;
      }
      setImageFile(file);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      firstName = cleanName.substring(0, spaceIndex).trim();
      lastName = cleanName.substring(spaceIndex + 1).trim();
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
      const profilePicToSend = uploadedUrl !== null ? uploadedUrl : (savedProfile?.profilePic || null);

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
        success(res.message || "User updated successfully");
        if (res.data) {
          // Update the preview card ONLY after clicking Save and receiving a successful API response
          setSavedProfile(res.data);
          const nameParts = [res.data.firstName || "", res.data.lastName || ""].filter(Boolean);
          setFullName(nameParts.join(" "));
          setEmail(res.data.email || "");
          setMobileNumber(res.data.mobileNumber || "");
          setDepartmentId(res.data.departmentId || "IT_ADMIN");
          setImageFile(null);
        }
        // Refresh the user profile across the application (sidebar, navbar)
        await refreshProfile();
      } else {
        toastError(res.error || "Failed to update profile.");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading profile details…</p>
      </div>
    );
  }

  // Derive preview details strictly from savedProfile
  const previewFullName = [savedProfile?.firstName, savedProfile?.lastName].filter(Boolean).join(" ");
  const previewEmail = savedProfile?.email || "";
  const previewDept = savedProfile?.departmentId || "";
  const previewPic = savedProfile?.profilePic || null;

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Edit Profile"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Edit Profile" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Summary & Picture (Independent Preview Card - updates only on successful Save) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 text-center space-y-3">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
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
                <h3 className="font-bold text-slate-900 text-sm">{previewFullName || "User Profile"}</h3>
                <p className="text-xs text-slate-500 truncate">{previewEmail}</p>
                {previewDept && (
                  <span className="inline-block mt-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {previewDept}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Card: Edit Profile Form */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">User Information</CardTitle>
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
                {/* Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="prof-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="h-9 text-xs"
                      required
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      First name and last name will be split automatically at the first space.
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="prof-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                    Email ID <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email ID"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="prof-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                    Mobile <span className="text-rose-500">*</span>
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="h-9 text-xs font-mono"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Department ID */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="prof-dept" className="text-xs font-semibold text-slate-700 sm:text-right">
                    Department
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-dept"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      placeholder="e.g. IT_ADMIN"
                      className="h-9 text-xs font-mono bg-slate-50"
                    />
                  </div>
                </div>

                {/* Profile Picture Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="prof-image" className="text-xs font-semibold text-slate-700 sm:text-right">
                    Profile Picture
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="prof-image"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleImageChange}
                      className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 h-8 text-xs font-semibold uppercase gap-1.5"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    SAVE CHANGES
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
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
