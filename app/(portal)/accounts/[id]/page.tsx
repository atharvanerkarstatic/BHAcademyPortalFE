"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit,
  ExternalLink,
  Loader2,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  getAccountByIdAction,
  updateAccountAction,
  uploadMediaAction,
} from "@/features/accounts/action";
import type {
  AccountItem,
  UpdateAccountPayload,
} from "@/features/accounts/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/validations";

export default function AccountDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const idOrBhBp = String(params.id ?? "");

  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const { data: account = null, isLoading: fetching } = useQuery({
    queryKey: queryKeys.accounts.detail(idOrBhBp),
    queryFn: ({ signal }) =>
      portalGet<AccountItem>(
        `accounts/${encodeURIComponent(idOrBhBp)}`,
        undefined,
        signal
      ),
    enabled: Boolean(idOrBhBp),
  });

  const setAccount = useCallback(
    (nextAccount: AccountItem | null) => {
      if (nextAccount) {
        queryClient.setQueryData(
          queryKeys.accounts.detail(idOrBhBp),
          nextAccount
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.all,
        });
      }
    },
    [idOrBhBp, queryClient]
  );

  // View mode: "details" | "edit"
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [bhBp, setBhBp] = useState("");
  const [emailId, setEmailId] = useState("");
  const [pincode, setPincode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [active, setActive] = useState(true);

  const [isSaving, startSavingTransition] = useTransition();

  const canUpdate = can("users.update") || can("accounts.update");

  const populateForm = (acc: AccountItem) => {
    setName(acc.name || "");
    const rawMobile = (acc.mobileNumber || acc.mobile || "")
      .replaceAll(/\D/gu, "")
      .slice(0, 10);
    setMobileNumber(rawMobile);
    setBhBp(acc.bhBp || acc.id || "");
    setEmailId(acc.emailId || acc.email || "");
    setPincode(acc.pinCode || acc.pincode || "");
    setActive(acc.active !== false && acc.status?.toLowerCase() !== "inactive");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }
    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Invalid image file");
      e.target.value = "";
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toastError("Full Name is required");
      return;
    }

    startSavingTransition(async () => {
      let imageString =
        account?.profilePic ||
        account?.profileImage ||
        account?.image ||
        account?.profilePicture ||
        "";
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("path", `profile_image_${Date.now()}`);

          const uploadRes = await uploadMediaAction(uploadFormData);
          if (uploadRes.success && uploadRes.data) {
            imageString = uploadRes.data;
          } else {
            console.warn("Image upload warning:", uploadRes.error);
          }
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }

      const finalBhBp = bhBp.trim() || account?.bhBp || idOrBhBp;
      const cleanedMobile = mobileNumber.replaceAll(/\D/gu, "");

      if (cleanedMobile && cleanedMobile.length !== 10) {
        toastError("Mobile number must be exactly 10 digits.");
        return;
      }

      // Payload matching:
      // {
      //   "name": "Rahul Sharma",
      //   "mobileNumber": null,
      //   "bhBp": "12345678",
      //   "emailId": "rahul.sharma@example.com",
      //   "image": "https://example.com/profile.jpg",
      //   "active": true,
      //   "pincode": "411002"
      // }
      const payload: UpdateAccountPayload = {
        name: name.trim(),
        mobileNumber: cleanedMobile || null,
        bhBp: finalBhBp,
        emailId: emailId.trim() || null,
        image: imageString || null,
        active,
        pincode: pincode.trim() || null,
      };

      const res = await updateAccountAction(finalBhBp, payload);

      if (res.success) {
        success(res.message || "Account updated successfully");

        // Immediately fetch the fresh account details by account ID/bhBp and update the card
        try {
          const freshRes = await getAccountByIdAction(finalBhBp);
          if (freshRes.success && freshRes.data) {
            setAccount(freshRes.data);
            populateForm(freshRes.data);
          } else if (res.data) {
            setAccount(res.data);
            populateForm(res.data);
          }
        } catch {
          if (res.data) {
            setAccount(res.data);
            populateForm(res.data);
          }
        }

        setImageFile(null);
        setIsEditing(false);
      } else {
        toastError(res.error || "Failed to update account");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading account details…</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600"
        >
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Link>
        </Button>
        <Card className="p-8 text-center text-slate-500">
          Account not found.
        </Card>
      </div>
    );
  }

  const isAccountActive =
    account.active !== false && account.status?.toLowerCase() !== "inactive";

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Back button to Accounts page */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Link>
        </Button>
      </div>

      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Account Details
        </h1>

        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/accounts" className="text-blue-600 hover:underline">
                Accounts
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-slate-700">Details</li>
          </ol>
        </nav>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* ========================================================== */}
        {/* Left Column: Account Details Side Card (Constant)          */}
        {/* ========================================================== */}
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b bg-white px-4 py-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Account Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {/* Profile Image Preview Box (Matches Course Image Preview) */}
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {(() => {
                  const avatarSrc =
                    account.profilePic ||
                    account.profileImage ||
                    account.image ||
                    account.profilePicture ||
                    undefined;
                  return avatarSrc ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt={account.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                      <User className="h-10 w-10 text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400">
                        No Profile Image
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Title below image */}
              <div className="border-b pb-3 text-center text-sm font-semibold text-slate-800">
                {account.name}
              </div>

              {/* Account Meta Info */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">Mobile:</span>
                  <span className="col-span-2 truncate font-mono text-slate-600">
                    {account.mobileNumber || account.mobile || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">
                    BP Number:
                  </span>
                  <span className="col-span-2 font-mono text-slate-700">
                    {account.bhBp || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">Email:</span>
                  <span className="col-span-2 truncate text-slate-600">
                    {account.emailId || account.email || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">Pincode:</span>
                  <span className="col-span-2 truncate font-mono text-slate-600">
                    {account.pinCode || account.pincode || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">State:</span>
                  <span className="col-span-2 truncate text-slate-600">
                    {account.state || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">City:</span>
                  <span className="col-span-2 truncate text-slate-600">
                    {account.city || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-semibold text-slate-700">
                    District:
                  </span>
                  <span className="col-span-2 truncate text-slate-600">
                    {account.district || "—"}
                  </span>
                </div>
              </div>

              {/* Action Buttons on Left Sidebar (Matches Screenshot 2 & 3) */}
              <div className="space-y-2 border-t pt-2">
                {/* Active / Inactive Badge Button */}
                <Button
                  type="button"
                  className={cn(
                    "h-8 w-full cursor-default justify-center gap-1.5 text-xs font-semibold text-white",
                    isAccountActive
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : "bg-rose-600 hover:bg-rose-600"
                  )}
                >
                  {isAccountActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {isAccountActive ? "Active" : "Inactive"}
                </Button>

                {/* Edit Account or Back to Details button */}
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      populateForm(account);
                      setIsEditing(false);
                    }}
                    className="h-8 w-full justify-center gap-1.5 border-blue-400 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Back to Details
                  </Button>
                ) : (
                  canUpdate && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        populateForm(account);
                        setIsEditing(true);
                      }}
                      className="h-8 w-full justify-center gap-1.5 border-blue-400 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )
                )}

                {/* Download Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const csvContent = `ID,Name,Mobile,BP Number,State,District,City,Status\n"${account.id}","${account.name}","${account.mobile || ""}","${account.bhBp || ""}","${account.state || ""}","${account.district || ""}","${account.city || ""}","${account.status || "Active"}"\n`;
                    const blob = new Blob([csvContent], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `account_${account.id}_details.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    success("Account details downloaded");
                  }}
                  className="h-8 w-full justify-center gap-1.5 border-blue-300 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================== */}
        {/* Right Column: Assessment Results OR Edit Form              */}
        {/* ========================================================== */}
        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
          {/* VIEW A: Assessment Results (Matches Screenshot 2) */}
          {!isEditing && (
            <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b bg-white px-6 py-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Assessment Results
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {account.assessmentResults &&
                account.assessmentResults.length > 0 ? (
                  account.assessmentResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between gap-4 rounded-lg border border-l-4 border-slate-200 border-l-emerald-600 bg-white p-4 text-xs shadow-2xs md:flex-row md:items-center"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          {result.courseName}
                        </p>
                        <p className="text-slate-500">{result.language}</p>
                      </div>

                      <div className="space-y-1 md:text-center">
                        <p className="font-semibold text-slate-800">
                          {result.score} ({result.percentage})
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                            {result.status}
                          </span>
                          <a
                            href={result.certificateUrl || "#"}
                            onClick={(e) => {
                              if (
                                !result.certificateUrl ||
                                result.certificateUrl === "#"
                              ) {
                                e.preventDefault();
                                success("Certificate viewing initiated");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Certificate
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-500 md:text-right">
                        <p>Date: {result.date}</p>
                        <p>Training: {result.mode}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No assessment results found for this account.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* VIEW B: Edit Account Form (Matches Screenshot 3) */}
          {isEditing && (
            <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b bg-white px-6 py-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Edit Account
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <form
                  onSubmit={handleSave}
                  className="mx-auto max-w-2xl space-y-4"
                >
                  {/* Full Name */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-name"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      Full Name
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                        }}
                        placeholder="Full Name"
                        className="h-9 text-xs"
                        required
                      />
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

                  {/* BP Number (Read-only) */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-bp"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      BP Number
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-bp"
                        value={bhBp}
                        readOnly
                        disabled
                        placeholder="e.g. 12345678"
                        className="h-9 cursor-not-allowed bg-slate-100 font-mono text-xs text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Email ID (Read-only) */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-email"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      Email ID
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-email"
                        type="email"
                        value={emailId}
                        readOnly
                        disabled
                        placeholder="e.g. rahul.sharma@example.com"
                        className="h-9 cursor-not-allowed bg-slate-100 text-xs text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-pincode"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      Pincode
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-pincode"
                        value={pincode}
                        onChange={(e) => {
                          setPincode(e.target.value);
                        }}
                        placeholder="e.g. 411002"
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-active"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      Status
                    </Label>
                    <div className="flex items-center gap-2 sm:col-span-3">
                      <Checkbox
                        id="edit-active"
                        checked={active}
                        onCheckedChange={(checked) => {
                          setActive(Boolean(checked));
                        }}
                      />
                      <Label
                        htmlFor="edit-active"
                        className="cursor-pointer text-xs font-medium text-slate-700"
                      >
                        Account is Active
                      </Label>
                    </div>
                  </div>

                  {/* Profile Picture */}
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
                    <Label
                      htmlFor="edit-pic"
                      className="text-xs font-semibold text-slate-700 sm:text-right"
                    >
                      Profile Picture
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-pic"
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

                  {/* SAVE / CANCEL buttons */}
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="h-8 min-w-20 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
                    >
                      {isSaving && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      SAVE
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        populateForm(account);
                        setIsEditing(false);
                      }}
                      className="h-8 min-w-20 border-slate-300 text-xs font-medium uppercase"
                    >
                      BACK
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
