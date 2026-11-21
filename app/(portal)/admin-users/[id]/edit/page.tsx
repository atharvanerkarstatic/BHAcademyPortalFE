"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, use } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import {
  updateAdminUserAction,
  resetUserPasswordAction,
} from "@/features/admin-users/action";
import type { AdminUserItem, RoleItem } from "@/features/admin-users/types";
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

function EditAdminUserForm({
  userId,
  adminUser,
  roles,
  loadingRoles,
}: {
  userId: string;
  adminUser: AdminUserItem;
  roles: Array<RoleItem>;
  loadingRoles: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: loggedInUser, can } = useAuth();
  const { success, error: toastError } = useToast();

  const [fullNameOverride, setFullNameOverride] = useState<string | null>(null);
  const [pincodeOverride, setPincodeOverride] = useState<string | null>(null);

  const fullName =
    fullNameOverride ??
    [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ");
  const pincode =
    pincodeOverride ?? (adminUser.pinCode || adminUser.pincode || "");

  const email = adminUser.email || "";
  const mobileNumber = adminUser.mobileNumber || "";
  const currentProfilePic = adminUser.profilePic || null;

  const derivedRoleId = useMemo(() => {
    if (adminUser.roles && adminUser.roles.length > 0) {
      return String(adminUser.roles[0].id);
    }
    if (adminUser.roleCodes && adminUser.roleCodes.length > 0) {
      const matched = roles.find((r) => r.code === adminUser.roleCodes?.[0]);
      if (matched) {
        return String(matched.id);
      }
    }
    return "";
  }, [adminUser, roles]);

  const [roleSelectionOverride, setRoleSelectionOverride] = useState<
    string | null
  >(null);
  const selectedRoleId = roleSelectionOverride ?? derivedRoleId;

  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isPending, startTransition] = useTransition();

  const canUpdate = can("users.update") || can("system.all");

  // Role can only be edited if createdById is present and matches the logged in user's ID
  let rawCreatedById: string | number | null | undefined;
  if (adminUser.createdById !== undefined && adminUser.createdById !== null) {
    rawCreatedById = adminUser.createdById;
  } else if (
    typeof adminUser.createdBy === "object" &&
    adminUser.createdBy !== null
  ) {
    rawCreatedById = adminUser.createdBy.id;
  } else {
    rawCreatedById = adminUser.createdBy;
  }

  const canEditRole =
    Boolean(rawCreatedById) &&
    Boolean(loggedInUser?.id) &&
    String(rawCreatedById) === String(loggedInUser?.id);

  const handleReset = () => {
    setFullNameOverride(null);
    setPincodeOverride(null);
    setRoleSelectionOverride(null);
    setNewImageFile(null);
    setNewPassword("");
    setShowPassword(false);
  };

  const handleBack = () => {
    handleReset();
    router.back();
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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

    const cleanPincode = pincode.replaceAll(/\D/gu, "").slice(0, 6);
    if (!cleanPincode) {
      toastError("Pincode is required.");
      return;
    }

    if (cleanPincode.length !== 6) {
      toastError("Pincode must be exactly 6 digits.");
      return;
    }

    // Password validation if entered
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      toastError("Password must be at least 6 characters long.");
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
            toastError(
              uploadRes.error || "Failed to upload image. Please try again."
            );
            return;
          }
        } catch (error) {
          console.error("Image upload exception:", error);
          toastError("An error occurred during image upload");
          return;
        }
      }

      // 1. Update user profile details
      const updateRes = await updateAdminUserAction(userId, {
        firstName,
        lastName,
        email: email.trim(),
        mobileNumber: mobileNumber.trim() || null,
        profilePic: profilePicValue,
        roleIds: selectedRoleId ? [selectedRoleId] : undefined,
        pinCode: cleanPincode,
      });

      if (!updateRes.success) {
        toastError(
          updateRes.error || "Failed to update user profile. Please try again."
        );
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);

      // 2. Only call reset password API if password field contains a newly entered value
      if (trimmedPassword) {
        const passwordRes = await resetUserPasswordAction(
          userId,
          trimmedPassword
        );
        if (!passwordRes.success) {
          toastError(
            passwordRes.error ||
              "User details updated, but failed to reset password."
          );
          return;
        }
        success("User details and password updated successfully");
      } else {
        success(updateRes.message || "User updated successfully");
      }

      router.push("/admin-users");
    });
  };

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

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Admin User
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <Link href="/admin-users">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Users List
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
                htmlFor="edit-fullname"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-fullname"
                  value={fullName}
                  onChange={(e) => {
                    setFullNameOverride(e.target.value);
                  }}
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
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
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
                  className="h-9 cursor-not-allowed bg-slate-100 text-xs text-slate-500"
                />
              </div>
            </div>

            {/* Role Picklist */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-role"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role {canEditRole && <span className="text-rose-500">*</span>}
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="edit-role"
                  value={selectedRoleId}
                  onChange={(e) => {
                    setRoleSelectionOverride(e.target.value);
                  }}
                  disabled={!canEditRole || loadingRoles}
                  suppressHydrationWarning
                  className={`h-9 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    canEditRole
                      ? "bg-white text-slate-800"
                      : "cursor-not-allowed bg-slate-100 text-slate-500 opacity-80"
                  }`}
                >
                  <option value="">Select a Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
                {!canEditRole && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Role can only be edited by the user who created this
                    account.
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Number (Read-only) */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
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
                  className="h-9 cursor-not-allowed bg-slate-100 font-mono text-xs text-slate-500"
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-pincode"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Pincode <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincodeOverride(
                      e.target.value.replaceAll(/\D/gu, "").slice(0, 6)
                    );
                  }}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Current Picture Preview & New Picture Upload */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-image"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Profile Picture
              </Label>
              <div className="space-y-2 sm:col-span-3">
                {currentProfilePic && (
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200">
                      <img
                        src={currentProfilePic}
                        alt="Current Profile"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      Current profile picture
                    </span>
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
                        toastError(
                          check.error ||
                            "Only .png, .jpg, and .jpeg image formats are allowed."
                        );
                        e.target.value = "";
                        setNewImageFile(null);
                        return;
                      }
                    }
                    setNewImageFile(file);
                  }}
                  className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                </p>
              </div>
            </div>

            {/* Change Password field below Profile Picture & above Save/Cancel */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-password"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Change Password
              </Label>
              <div className="sm:col-span-3">
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                    }}
                    placeholder="Enter new password to reset (leave blank to keep unchanged)"
                    autoComplete="new-password"
                    className="h-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((prev) => !prev);
                    }}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave empty if you do not wish to change the user&apos;s
                  password. Minimum 6 characters if entered.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 min-w-24 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-8 min-w-24 border-slate-300 text-xs font-medium uppercase"
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

export default function EditAdminUserPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const userId = params.id;
  const { can } = useAuth();
  const canUpdate = can("users.update") || can("system.all");

  const {
    data: adminUser,
    isLoading: loadingUser,
    isError: isUserError,
    error: userError,
  } = useQuery({
    queryKey: queryKeys.adminUsers.detail(userId),
    queryFn: ({ signal }) =>
      portalGet<AdminUserItem>(
        `admin-users/${encodeURIComponent(userId)}`,
        undefined,
        signal
      ),
    enabled: Boolean(userId) && canUpdate,
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: queryKeys.rolesPicklist,
    queryFn: ({ signal }) =>
      portalGet<Array<RoleItem>>("roles", { picklist: "1" }, signal),
    enabled: canUpdate,
    staleTime: 5 * 60_000,
  });

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

  if (loadingUser) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!adminUser) {
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
        <Card className="space-y-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {isUserError && userError instanceof Error
              ? userError.message
              : "Failed to load user details."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin-users">Back to Admin Users List</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <EditAdminUserForm
      key={adminUser.id}
      userId={userId}
      adminUser={adminUser}
      roles={roles}
      loadingRoles={loadingRoles}
    />
  );
}
