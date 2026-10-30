"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  requestPasswordResetOtpAction,
  resetPasswordWithTokenAction,
  verifyPasswordResetOtpAction,
} from "@/features/auth/action";

type Step = "EMAIL" | "OTP" | "PASSWORD" | "SUCCESS";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  // Step state
  const [step, setStep] = useState<Step>("EMAIL");

  // Field states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const isStrongPassword = hasMinLength && hasMixedCase && hasNumberOrSymbol;

  // 1. Submit Email -> Send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toastError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtpAction(cleanEmail);
      if (res.success) {
        toastSuccess(res.message);
        setStep("OTP");
      } else {
        toastError(res.error || res.message);
      }
    } catch {
      toastError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await requestPasswordResetOtpAction(email.trim());
      if (res.success) {
        toastSuccess(res.message || "A new OTP has been sent.");
      } else {
        toastError(res.error || res.message);
      }
    } catch {
      toastError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      toastError("Please enter the OTP verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetOtpAction(email.trim(), cleanOtp);
      if (res.success && res.resetToken) {
        toastSuccess(res.message);
        setResetToken(res.resetToken);
        if (res.maskedMobile) setMaskedMobile(res.maskedMobile);
        setStep("PASSWORD");
      } else {
        toastError(res.error || res.message || "Failed to verify OTP.");
      }
    } catch {
      toastError("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset Password & Redirect to Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      toastError("Session expired. Please request a new OTP.");
      setStep("EMAIL");
      return;
    }

    if (password.length < 8) {
      toastError("Password must be at least 8 characters long.");
      return;
    }

    if (!isStrongPassword) {
      toastError(
        "Please create a strong password containing uppercase, lowercase, and numbers/symbols."
      );
      return;
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithTokenAction({
        resetToken,
        newPassword: password,
        confirmPassword,
      });

      if (res.success) {
        toastSuccess(res.message || "Password has been reset successfully. Please log in with your new password.");
        setStep("SUCCESS");

        // Redirect to Login page after a brief delay for toast visibility
        setTimeout(() => {
          router.push("/login");
        }, 1200);
      } else {
        toastError(res.error || res.message);
        setLoading(false);
      }
    } catch {
      toastError("Failed to reset password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        {/* Top Header */}
        <div className="flex flex-col items-center border-b px-6 py-6">
          <Image
            src="/logo.png"
            alt="AP Colour Academy"
            width={180}
            height={180}
            priority
            className="h-auto w-44"
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {step === "PASSWORD" ? "Set New Password" : "Forgot Password"}
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            {step === "EMAIL" && "Enter your registered email to receive a verification OTP"}
            {step === "OTP" &&
              (maskedMobile
                ? `Enter the OTP sent to your registered mobile ending with ${maskedMobile}`
                : `Enter the OTP sent to your registered contact`)}
            {step === "PASSWORD" && "Create a secure, strong password for your account"}
            {step === "SUCCESS" && "Password reset successful! Redirecting to login…"}
          </p>

          {/* Stepper Dots */}
          {step !== "SUCCESS" && (
            <div className="mt-4 flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step === "EMAIL"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                1
              </span>
              <div
                className={`h-0.5 w-6 ${
                  step === "OTP" || step === "PASSWORD"
                    ? "bg-blue-600"
                    : "bg-slate-200"
                }`}
              />
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step === "OTP"
                    ? "bg-blue-600 text-white"
                    : step === "PASSWORD"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </span>
              <div
                className={`h-0.5 w-6 ${
                  step === "PASSWORD" ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step === "PASSWORD"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                3
              </span>
            </div>
          )}
        </div>

        {/* STEP 1: ENTER EMAIL */}
        {step === "EMAIL" && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 p-6">
            <p className="text-center text-sm text-slate-600">
              Please enter your registered email address. We will send an OTP to verify your account.
            </p>

            <div className="flex">
              <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-l-none bg-slate-50"
              />
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Sending OTP…" : "Send OTP"}
              </Button>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === "OTP" && (
          <form onSubmit={handleOtpSubmit} className="space-y-5 p-6">
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
              OTP sent for <strong>{email}</strong>
              {maskedMobile && (
                <span> (mobile ending with <strong>{maskedMobile}</strong>)</span>
              )}. Please enter the 6-digit code below.
            </div>

            <div className="flex">
              <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                <KeyRound className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="h-11 rounded-l-none bg-slate-50 tracking-widest text-center font-mono text-lg font-semibold"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStep("EMAIL")}
                className="text-slate-500 hover:text-blue-600 hover:underline"
              >
                Change Email
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleResendOtp}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                Resend OTP
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Verifying OTP…" : "Verify OTP"}
              </Button>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW STRONG PASSWORD */}
        {step === "PASSWORD" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 p-6">
            <p className="text-center text-xs text-slate-600">
              Create a new strong password for <strong>{email}</strong>
            </p>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">New Password</label>
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter strong password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-none border-x-0 bg-slate-50 focus-visible:ring-0 focus-visible:border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Confirm Password</label>
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-none border-x-0 bg-slate-50 focus-visible:ring-0 focus-visible:border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Requirements */}
            <div className="rounded-md bg-slate-50 p-3 text-xs space-y-1 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
              <div className="flex items-center gap-1.5">
                <Check
                  className={`h-3.5 w-3.5 ${
                    hasMinLength ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                <span className={hasMinLength ? "text-emerald-700" : "text-slate-500"}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check
                  className={`h-3.5 w-3.5 ${
                    hasMixedCase ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                <span className={hasMixedCase ? "text-emerald-700" : "text-slate-500"}>
                  Includes uppercase & lowercase letters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check
                  className={`h-3.5 w-3.5 ${
                    hasNumberOrSymbol ? "text-emerald-600" : "text-slate-300"
                  }`}
                />
                <span className={hasNumberOrSymbol ? "text-emerald-700" : "text-slate-500"}>
                  Includes numbers or special symbols
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Resetting Password…" : "Reset Password"}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS & REDIRECTING */}
        {step === "SUCCESS" && (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-pulse" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Password Reset Successfully!
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Redirecting to login page… Please sign in with your new password.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-xs font-semibold"
              size="sm"
            >
              Go to Login Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
