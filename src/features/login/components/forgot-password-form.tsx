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
import {
  loginAction,
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
  verifyPasswordResetOtpAction,
} from "@/features/auth/action";

type Step = "EMAIL" | "OTP" | "PASSWORD" | "SUCCESS";

export default function ForgotPasswordForm() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("EMAIL");

  // Field states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status messages
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const isStrongPassword = hasMinLength && hasMixedCase && hasNumberOrSymbol;

  // 1. Submit Email -> Send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setApiMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtpAction(cleanEmail);
      if (res.success) {
        setApiMessage(res.message);
        setStep("OTP");
      } else {
        setErrorMessage(res.error || res.message);
      }
    } catch {
      setErrorMessage("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend OTP
  const handleResendOtp = async () => {
    setErrorMessage(null);
    setApiMessage(null);
    setLoading(true);
    try {
      const res = await requestPasswordResetOtpAction(email.trim());
      if (res.success) {
        setApiMessage(res.message || "A new OTP has been sent to your email.");
      } else {
        setErrorMessage(res.error || res.message);
      }
    } catch {
      setErrorMessage("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setApiMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMessage("Please enter the OTP verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetOtpAction(email.trim(), cleanOtp);
      if (res.success) {
        setApiMessage(res.message);
        setStep("PASSWORD");
      } else {
        setErrorMessage(res.error || res.message);
      }
    } catch {
      setErrorMessage("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset Password & Log In
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setApiMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!isStrongPassword) {
      setErrorMessage(
        "Please create a strong password containing uppercase, lowercase, and numbers/symbols."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithOtpAction({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: password,
      });

      if (res.success) {
        setApiMessage(res.message);
        setStep("SUCCESS");

        // Automatically log in the user and navigate to dashboard
        try {
          await loginAction(email.trim(), password);
        } catch {
          // Fallback redirect if redirect thrown by Next.js Server Action
          router.push("/dashboard");
        }
      } else {
        setErrorMessage(res.error || res.message);
        setLoading(false);
      }
    } catch {
      // If Next.js redirect was triggered inside loginAction
      router.push("/dashboard");
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
            {step === "OTP" && `Enter the OTP sent to ${email}`}
            {step === "PASSWORD" && "Create a secure, strong password for your account"}
            {step === "SUCCESS" && "Password reset successful! Logging you in…"}
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
                  step === "OTP" || step === "PASSWORD" ? "bg-blue-600" : "bg-slate-200"
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

        <div className="p-6">
          {/* API Success Banner */}
          {apiMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{apiMessage}</span>
            </div>
          )}

          {/* API Error Banner */}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === "EMAIL" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  type="email"
                  placeholder="Registered Email ID"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-l-none bg-slate-50"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Sending OTP…" : "Send Verification OTP"}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === "OTP" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <KeyRound className="h-4 w-4" />
                </span>
                <Input
                  type="text"
                  placeholder="Enter OTP Code"
                  autoComplete="one-time-code"
                  maxLength={10}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="h-11 rounded-l-none bg-slate-50 tracking-wider font-mono"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setApiMessage(null);
                    setStep("EMAIL");
                  }}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50"
                >
                  <RotateCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  Resend OTP
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Verifying OTP…" : "Verify OTP"}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Cancel & Return to Login
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3: Create Strong Password & Confirm */}
          {step === "PASSWORD" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Strong Password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-none border-x-0 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="flex">
                <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-none border-x-0 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Requirements Helper */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-slate-700">Password Requirements:</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] ${
                      hasMinLength ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={hasMinLength ? "text-emerald-700" : "text-slate-500"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] ${
                      hasMixedCase ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={hasMixedCase ? "text-emerald-700" : "text-slate-500"}>
                    Uppercase & lowercase letters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] ${
                      hasNumberOrSymbol ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={hasNumberOrSymbol ? "text-emerald-700" : "text-slate-500"}>
                    At least one number or special symbol
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-blue-500 text-sm font-semibold hover:bg-blue-600"
              >
                {loading ? "Resetting Password…" : "Reset Password & Login"}
              </Button>
            </form>
          )}

          {/* STEP 4: Success & Redirecting */}
          {step === "SUCCESS" && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Password Successfully Reset!
              </p>
              <p className="text-xs text-slate-500">
                Redirecting you to the dashboard…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

