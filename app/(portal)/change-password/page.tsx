"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, Eye, EyeOff } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { changePasswordAction } from "@/features/profile/action";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toastError("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      toastError("Please enter your new password.");
      return;
    }

    if (newPassword.length < 8) {
      toastError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError("New password and confirm password do not match.");
      return;
    }

    startTransition(async () => {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setIsSuccess(true);
        success(res.message || "Password changed successfully. Please log in again.");
        setTimeout(() => {
          router.push("/login");
        }, 3500);
      } else {
        toastError(res.error || "Failed to change password.");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Change Password"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Change Password" },
        ]}
      />

      <div className="mx-auto max-w-xl">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Update Password</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Enter your current password and set a secure new password.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="curr-pwd" className="text-xs font-semibold text-slate-700">
                  Current Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="curr-pwd"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-10 text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-pwd" className="text-xs font-semibold text-slate-700">
                  New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="new-pwd"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="h-10 text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pwd" className="text-xs font-semibold text-slate-700">
                  Confirm New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-pwd"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-10 text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                After changing your password, your current session will end and you will be asked to log in again with the new credentials.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isPending || isSuccess}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-36 h-9 text-xs font-semibold uppercase gap-1.5"
                >
                  {(isPending || isSuccess) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSuccess ? "LOGGING OUT…" : "CHANGE PASSWORD"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="min-w-24 h-9 text-xs font-medium uppercase border-slate-300"
                >
                  <Link href="/dashboard">CANCEL</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

