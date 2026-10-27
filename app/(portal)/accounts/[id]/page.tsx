"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  List,
  Loader2,
  Upload,
  User,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import {
  getAccountByIdAction,
  getAccountsAction,
  updateAccountAction,
  uploadMediaAction,
} from "@/features/accounts/action";
import type { AccountItem } from "@/features/accounts/types";
import { cn } from "@/lib/utils";

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idOrBhBp = params.id as string;

  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [account, setAccount] = useState<AccountItem | null>(null);
  const [fetching, setFetching] = useState(true);

  // View mode: "details" (matches screenshot 2) | "edit" (matches screenshot 3)
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [bhBp, setBhBp] = useState("");
  const [emailId, setEmailId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [active, setActive] = useState(true);

  const [isSaving, startSavingTransition] = useTransition();

  const canUpdate = can("users.update") || can("accounts.update");

  useEffect(() => {
    let mounted = true;
    setFetching(true);

    getAccountByIdAction(idOrBhBp)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setAccount(res.data);
          populateForm(res.data);
        } else {
          toastError(res.error || "Failed to load account details");
        }
      })
      .catch((err) => {
        console.error("Failed to load account:", err);
        toastError("Failed to load account details");
      })
      .finally(() => {
        if (mounted) setFetching(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrBhBp]);

  const populateForm = (acc: AccountItem) => {
    setName(acc.name || "");
    setMobileNumber(acc.mobileNumber || acc.mobile || "");
    setState(acc.state || "");
    setDistrict(acc.district || "");
    setCity(acc.city || "");
    setBhBp(acc.bhBp || acc.id || "");
    setEmailId(acc.emailId || acc.email || "");
    setActive(acc.active !== false && acc.status?.toLowerCase() !== "inactive");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastError("Full Name is required");
      return;
    }
    if (!mobileNumber.trim()) {
      toastError("Mobile is required");
      return;
    }

    startSavingTransition(async () => {
      let imageString = account?.profileImage || account?.image || account?.profilePicture || "";
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
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      }

      // JSON payload matching PUT /api/v1/account/{idOrBhBp}:
      // {
      //   "name": "Example 3",
      //   "mobile": "7999875496",
      //   "state": "testing",
      //   "district": "Nagpur",
      //   "city": "testing",
      //   "emailId": "testing",
      //   "image": "...",
      //   "bhBp": "Bh_999",
      //   "active": "false"
      // }
      const finalBhBp = (bhBp.trim() || account?.bhBp || idOrBhBp);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        mobile: mobileNumber.trim(),
        mobileNumber: mobileNumber.trim(),
        state: state.trim(),
        district: district.trim(),
        city: city.trim(),
        emailId: emailId.trim(),
        image: imageString,
        bhBp: finalBhBp,
        active: String(active),
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
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Link>
        </Button>
        <Card className="p-8 text-center text-slate-500">Account not found.</Card>
      </div>
    );
  }

  const isAccountActive = account.active !== false && account.status?.toLowerCase() !== "inactive";

  return (
    <div className="w-full space-y-4 pb-12">
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
            <li className="text-slate-700 font-medium">Details</li>
          </ol>
        </nav>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* ========================================================== */}
        {/* Left Column: Account Details Side Card (Constant)          */}
        {/* ========================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header: Name */}
            <div className="border-b px-4 py-3 bg-white">
              <h2 className="text-base font-bold text-slate-900">{account.name}</h2>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Profile Image Box */}
              <div className="mx-auto w-28 h-28 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative shadow-2xs">
                {account.profileImage || account.image || account.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={account.profileImage || account.image || account.profilePicture}
                    src={account.profileImage || account.image || account.profilePicture}
                    alt={account.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const fallback = img.parentElement?.querySelector(".avatar-fallback");
                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback flex items-center justify-center w-full h-full text-slate-300"
                  style={{
                    display: account.profileImage || account.image || account.profilePicture ? "none" : "flex",
                  }}
                >
                  <User className="h-16 w-16" />
                </div>
              </div>

              {/* Account Meta Grid (Matches screenshot 2) */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">Mobile:</span>
                  <span className="col-span-2 font-mono text-slate-600">
                    {account.mobileNumber || account.mobile || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">OTP:</span>
                  <span className="col-span-2 font-mono text-slate-600">{account.otp || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">Email:</span>
                  <span className="col-span-2 text-slate-600 truncate">
                    {account.emailId || account.email || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">BP Number:</span>
                  <span className="col-span-2 font-mono text-slate-600">{account.bhBp || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">State:</span>
                  <span className="col-span-2 text-slate-600">{account.state || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">District:</span>
                  <span className="col-span-2 text-slate-600">{account.district || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">City:</span>
                  <span className="col-span-2 text-slate-600">{account.city || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">Signup Date:</span>
                  <span className="col-span-2 text-slate-600">{account.signupDate || "—"}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="font-semibold text-slate-700">Signup IP:</span>
                  <span className="col-span-2 font-mono text-slate-600">{account.signupIp || "—"}</span>
                </div>
              </div>

              {/* Action Buttons on Left Sidebar (Matches Screenshot 2 & 3) */}
              <div className="space-y-2 pt-2 border-t">
                {/* Active / Inactive Badge Button */}
                <Button
                  type="button"
                  className={cn(
                    "w-full justify-center gap-1.5 text-xs font-semibold text-white h-8 cursor-default",
                    isAccountActive ? "bg-emerald-600 hover:bg-emerald-600" : "bg-rose-600 hover:bg-rose-600"
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
                    className="w-full justify-center gap-1.5 text-xs font-medium text-blue-600 border-blue-400 hover:bg-blue-50 h-8"
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
                      className="w-full justify-center gap-1.5 text-xs font-medium text-blue-600 border-blue-400 hover:bg-blue-50 h-8"
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
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `account_${account.id}_details.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    success("Account details downloaded");
                  }}
                  className="w-full justify-center gap-1.5 text-xs font-medium text-blue-600 border-blue-300 hover:bg-blue-50 h-8"
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
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* VIEW A: Assessment Results (Matches Screenshot 2) */}
          {!isEditing && (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b px-6 py-3 bg-white">
                <CardTitle className="text-base font-bold text-slate-900">
                  Assessment Results
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {account.assessmentResults && account.assessmentResults.length > 0 ? (
                  account.assessmentResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border-l-4 border-l-emerald-600 border border-slate-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm">{result.courseName}</p>
                        <p className="text-slate-500">{result.language}</p>
                      </div>

                      <div className="space-y-1 md:text-center">
                        <p className="font-semibold text-slate-800">
                          {result.score} ({result.percentage})
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-block rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            {result.status}
                          </span>
                          <a
                            href={result.certificateUrl || "#"}
                            onClick={(e) => {
                              if (!result.certificateUrl || result.certificateUrl === "#") {
                                e.preventDefault();
                                success("Certificate viewing initiated");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium text-xs"
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
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No assessment results found for this account.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* VIEW B: Edit Account Form (Matches Screenshot 3) */}
          {isEditing && (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b px-6 py-3 bg-white">
                <CardTitle className="text-base font-bold text-slate-900">Edit Account</CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-4">
                  {/* Full Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                      Full Name
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                      Mobile
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-mobile"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Mobile"
                        className="h-9 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* State (Picklist dropdown) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-state" className="text-xs font-semibold text-slate-700 sm:text-right">
                      State
                    </Label>
                    <div className="sm:col-span-3">
                      <select
                        id="edit-state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select State...</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Delhi">Delhi</option>
                        <option value="West Bengal">West Bengal</option>
                      </select>
                    </div>
                  </div>

                  {/* District (Picklist dropdown) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-district" className="text-xs font-semibold text-slate-700 sm:text-right">
                      District
                    </Label>
                    <div className="sm:col-span-3">
                      <select
                        id="edit-district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select District...</option>
                        <option value="Belgavi">Belgavi</option>
                        <option value="Nagpur">Nagpur</option>
                        <option value="Buldana">Buldana</option>
                        <option value="Jamtara">Jamtara</option>
                        <option value="East Kameng">East Kameng</option>
                        <option value="Pune">Pune</option>
                        <option value="Mumbai">Mumbai</option>
                      </select>
                    </div>
                  </div>

                  {/* City (Picklist dropdown) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-city" className="text-xs font-semibold text-slate-700 sm:text-right">
                      City
                    </Label>
                    <div className="sm:col-span-3">
                      <select
                        id="edit-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select City...</option>
                        <option value="Belgavi">Belgavi</option>
                        <option value="Nagpur">Nagpur</option>
                        <option value="Buldana">Buldana</option>
                        <option value="Jamtara">Jamtara</option>
                        <option value="East Kameng">East Kameng</option>
                        <option value="Pune">Pune</option>
                        <option value="Mumbai">Mumbai</option>
                      </select>
                    </div>
                  </div>

                  {/* BP Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-bp" className="text-xs font-semibold text-slate-700 sm:text-right">
                      BP Number
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-bp"
                        value={bhBp}
                        onChange={(e) => setBhBp(e.target.value)}
                        placeholder="BP Number"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Email ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                      Email ID
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-email"
                        type="email"
                        value={emailId}
                        onChange={(e) => setEmailId(e.target.value)}
                        placeholder="Email ID"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Profile Picture */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-pic" className="text-xs font-semibold text-slate-700 sm:text-right">
                      Profile Picture
                    </Label>
                    <div className="sm:col-span-3">
                      <Input
                        id="edit-pic"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                      />
                    </div>
                  </div>

                  {/* SAVE / CANCEL buttons */}
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-20 h-8 text-xs font-semibold uppercase"
                    >
                      {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      SAVE
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        populateForm(account);
                        setIsEditing(false);
                      }}
                      className="min-w-20 h-8 text-xs font-medium uppercase border-slate-300"
                    >
                      CANCEL
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
