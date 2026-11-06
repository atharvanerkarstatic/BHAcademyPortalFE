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
import {
  getAdminUserByIdAction,
  updateAdminUserAction,
  getRolesPicklistAction,
} from "@/features/admin-users/action";
import type { AdminUserItem, RoleItem } from "@/features/admin-users/types";
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

export default function EditAdminUserPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const userId = params.id;

  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUserItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentProfilePic, setCurrentProfilePic] = useState<string | null>(null);

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [isPending, startTransition] = useTransition();

  const canUpdate = can("users.update") || can("system.all");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoadingInitial(true);
      const [userRes, rolesRes] = await Promise.all([
        getAdminUserByIdAction(userId),
        getRolesPicklistAction(),
      ]);

      if (!active) return;

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }

      if (userRes.success && userRes.data) {
        const u = userRes.data;
        setAdminUser(u);
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
        setFullName(name);
        setEmail(u.email || "");
        setMobileNumber(u.mobileNumber || "");
        setCurrentProfilePic(u.profilePic || null);

        if (u.roles && u.roles.length > 0) {
          setSelectedRoleId(String(u.roles[0].id));
        } else if (u.roleCodes && u.roleCodes.length > 0 && rolesRes.data) {
          const matched = rolesRes.data.find((r) => r.code === u.roleCodes?.[0]);
          if (matched) setSelectedRoleId(String(matched.id));
        }
      } else {
        toastError(userRes.error || "Failed to load user details");
      }
      setLoadingRoles(false);
      setLoadingInitial(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [userId]);

  const handleReset = () => {
    if (adminUser) {
      const name = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ");
      setFullName(name);
      setEmail(adminUser.email || "");
      setMobileNumber(adminUser.mobileNumber || "");
      setCurrentProfilePic(adminUser.profilePic || null);
      if (adminUser.roles && adminUser.roles.length > 0) {
        setSelectedRoleId(String(adminUser.roles[0].id));
      }
      setNewImageFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canUpdate) {
      toastError("You do not have permission to update users.");
      return;
    }

    const { firstName, lastName } = splitName(fullName);
    if (!firstName) {
      toastError("Full Name is required.");
      return;
    }

    if (!email.trim()) {
      toastError("Email address is required.");
      return;
    }

    startTransition(async () => {
      let profilePicValue: string | null = currentProfilePic;

      if (newImageFile) {
        try {
          const formData = new FormData();
          formData.append("file", newImageFile);
          formData.append("path", `admin_user_${userId}_${Date.now()}`);

          const uploadRes = await uploadMediaAction(formData);
          if (uploadRes.success && uploadRes.data) {
            profilePicValue = uploadRes.data;
          } else {
            toastError(uploadRes.error || "Failed to upload image. Please try again.");
            return;
          }
        } catch (err) {
          console.error("Image upload exception:", err);
          toastError("Failed to upload image file.");
          return;
        }
      }

      const res = await updateAdminUserAction(userId, {
        firstName,
        lastName,
        email: email.trim(),
        mobileNumber: mobileNumber.trim() || null,
        profilePic: profilePicValue,
        roleIds: selectedRoleId ? [selectedRoleId] : undefined,
      });

      if (res.success) {
        success(res.message || "User updated successfully");
        router.push("/admin-users");
      } else {
        toastError(res.error || "Failed to update user. Please try again.");
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

  if (!canUpdate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit Admin User"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin Users", href: "/admin-users" },
            { label: "Edit Admin User" },
          ]}
        />
        <Card className="p-8 text-center text-slate-500">
          You do not have permission to edit users.
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Admin Users"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin Users", href: "/admin-users" },
          { label: "Edit Admin User" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Admin User
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/admin-users">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Users List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-fullname"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  First name and last name will be split at the first space.
                </p>
              </div>
            </div>

            {/* Email Address (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-email"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Email Address
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  placeholder="e.g. john.doe@asianpaints.com"
                  className="h-9 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Role Picklist (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-role"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="edit-role"
                  value={selectedRoleId}
                  disabled
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-500 shadow-xs cursor-not-allowed opacity-80"
                >
                  <option value="">Select a Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Number (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-mobile"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-mobile"
                  value={mobileNumber}
                  readOnly
                  disabled
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs font-mono bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Current Picture Preview & New Picture Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-image"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Profile Picture
              </Label>
              <div className="sm:col-span-3 space-y-2">
                {currentProfilePic && (
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentProfilePic}
                        alt="Current Profile"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-slate-500">Current profile picture</span>
                  </div>
                )}
                <Input
                  id="edit-image"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const check = validateImageFile(file);
                      if (!check.valid) {
                        toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed.");
                        e.target.value = "";
                        setNewImageFile(null);
                        return;
                      }
                    }
                    setNewImageFile(file);
                  }}
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
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
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
