"use client";

import { useEffect, useState, useTransition } from "react";
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
import { uploadMediaAction } from "@/features/accounts/action";
import {
  createAdminUserAction,
  getRolesPicklistAction,
} from "@/features/admin-users/action";
import type { RoleItem } from "@/features/admin-users/types";
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

export default function NewAdminUserPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("1");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("system.all");

  useEffect(() => {
    handleReset();
    let mounted = true;

    getRolesPicklistAction().then((res) => {
      if (!mounted) return;
      if (res.success && res.data) {
        setRoles(res.data);
        if (res.data.length > 0 && !selectedRoleId) {
          setSelectedRoleId(String(res.data[0].id));
        }
      } else {
        toastError(res.error || "Failed to load roles picklist.");
      }
      setLoadingRoles(false);
    });

    return () => {
      mounted = false;
      handleReset();
    };
  }, []);

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setMobileNumber("");
    setImageFile(null);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toastError("You do not have permission to create users.");
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

    if (!password) {
      toastError("Password is required.");
      return;
    }

    if (password.length < 8) {
      toastError("Password must be at least 8 characters long.");
      return;
    }

    if (!selectedRoleId) {
      toastError("Please select a role for this user.");
      return;
    }

    startTransition(async () => {
      let uploadedPicUrl: string | null = null;

      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("path", `admin_user_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            uploadedPicUrl = uploadRes.data;
          } else {
            toastError(uploadRes.error || "Failed to upload profile picture.");
            return;
          }
        } catch {
          toastError("Failed to upload image file.");
          return;
        }
      }

      const res = await createAdminUserAction({
        firstName,
        lastName,
        email: email.trim(),
        password,
        mobileNumber: mobileNumber.trim() || null,
        profilePic: uploadedPicUrl,
        roleIds: [selectedRoleId],
      });

      if (res.success) {
        success(res.message || "User created successfully");
        handleReset();
        router.push("/admin-users");
      } else {
        toastError(res.error || "Failed to create user. Please try again.");
      }
    });
  };

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Add New Admin User"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin Users", href: "/admin-users" },
            { label: "Add" },
          ]}
        />
        <Card className="p-8 text-center text-slate-500">
          You do not have permission to create users.
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
          { label: "Add New Admin User" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Admin User
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/admin-users">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Users List
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
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-fullname"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="user-fullname"
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

            {/* Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-email"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john.doe@asianpaints.com"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-password"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Role Picklist */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-role"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="user-role"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  disabled={loadingRoles}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  required
                >
                  {roles.length === 0 && <option value="">Loading roles...</option>}
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-mobile"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Mobile Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="user-mobile"
                  value={mobileNumber}
                  onChange={(e) =>
                    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="user-image"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Profile Picture
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="user-image"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const check = validateImageFile(file);
                      if (!check.valid) {
                        toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed.");
                        e.target.value = "";
                        setImageFile(null);
                        return;
                      }
                    }
                    setImageFile(file);
                  }}
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
