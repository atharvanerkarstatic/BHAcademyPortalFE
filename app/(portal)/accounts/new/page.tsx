"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User, Phone, MapPin, Building, ShieldCheck, Mail } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { createAccountAction, uploadMediaAction } from "@/features/accounts/action";

export default function NewAccountPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [bhBp, setBhBp] = useState("");
  const [emailId, setEmailId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [active, setActive] = useState(true);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("accounts.create");

  useEffect(() => {
    // Prevent Next.js client caching on mount/revisit
    setName("");
    setMobileNumber("");
    setState("");
    setDistrict("");
    setCity("");
    setBhBp("");
    setEmailId("");
    setImageFile(null);
    setActive(true);
    setFormKey((k) => k + 1);

    return () => {
      setName("");
      setMobileNumber("");
      setState("");
      setDistrict("");
      setCity("");
      setBhBp("");
      setEmailId("");
      setImageFile(null);
    };
  }, []);

  const handleReset = () => {
    setName("");
    setMobileNumber("");
    setState("");
    setDistrict("");
    setCity("");
    setBhBp("");
    setEmailId("");
    setImageFile(null);
    setActive(true);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toastError("Full Name is required.");
      return;
    }
    if (!mobileNumber.trim()) {
      toastError("Mobile number is required.");
      return;
    }
    if (!state.trim()) {
      toastError("State is required.");
      return;
    }
    if (!city.trim()) {
      toastError("City is required.");
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
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      }

      // JSON payload exactly matching:
      // {
      //   "name": "string",
      //   "mobileNumber": "stringstri",
      //   "state": "string",
      //   "district": "string",
      //   "city": "string",
      //   "bhBp": "string",
      //   "emailId": "string",
      //   "image": "string"
      // }
      const payload: Record<string, unknown> = {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        state: state.trim(),
        district: district.trim(),
        city: city.trim(),
        bhBp: bhBp.trim(),
        emailId: emailId.trim(),
        image: imageUrl,
        active: String(active),
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
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-mobile" className="text-xs font-semibold text-slate-700 sm:text-right">
                Mobile <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* State */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-state" className="text-xs font-semibold text-slate-700 sm:text-right">
                State <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* District */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-district" className="text-xs font-semibold text-slate-700 sm:text-right">
                District
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* City */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-city" className="text-xs font-semibold text-slate-700 sm:text-right">
                City <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* BP Number */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-bp" className="text-xs font-semibold text-slate-700 sm:text-right">
                BP Number
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-bp"
                  value={bhBp}
                  onChange={(e) => setBhBp(e.target.value)}
                  placeholder="e.g. Bh_000011111111"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Email ID */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="acc-email" className="text-xs font-semibold text-slate-700 sm:text-right">
                Email ID
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-email"
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
              <Label htmlFor="acc-image" className="text-xs font-semibold text-slate-700 sm:text-right">
                Profile Picture
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="acc-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
            </div>

            {/* Status Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label className="text-xs font-semibold text-slate-700 sm:text-right">Status</Label>
              <div className="sm:col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="acc-active"
                  checked={active}
                  onCheckedChange={(c) => setActive(Boolean(c))}
                />
                <Label htmlFor="acc-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active
                </Label>
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
