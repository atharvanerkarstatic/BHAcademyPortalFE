"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/features/auth/action";

export default function LoginForm({ ip }: { ip: ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
    const handlePageShow = () => setLoading(false);
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError("Please enter your email ID");
      return;
    }

    if (!cleanPassword) {
      setError("Please enter your password");
      return;
    }

    if (cleanPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAction(cleanEmail, cleanPassword);
      if (result && !result.success) {
        setError(result.error ?? "Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err: unknown) {
      if (
        (err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as Record<string, unknown>).digest === "string" &&
          String((err as Record<string, unknown>).digest).includes("NEXT_REDIRECT")) ||
        (err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as Record<string, unknown>).message === "string" &&
          String((err as Record<string, unknown>).message).includes("NEXT_REDIRECT"))
      ) {
        throw err;
      }
      setError("Something went wrong. Please check your network and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="flex flex-col items-center border-b px-6 py-6">
          <Image
            src="/logo.png"
            alt="AP Colour Academy"
            width={180}
            height={180}
            priority
            className="h-auto w-44"
          />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Login
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <p className="text-center text-slate-600">
            Sign in to access your dashboard
          </p>

          {/* Email input with icon on the left */}
          <div className="flex">
            <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
              <Mail className="h-4 w-4" />
            </span>
            <Input
              type="email"
              placeholder="Email ID"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className="h-11 rounded-l-none bg-slate-50"
            />
          </div>

          {/* Password input with lock icon on the left and toggle eye button on the right */}
          <div className="flex">
            <span className="flex w-12 items-center justify-center rounded-l-md border border-r-0 bg-slate-100 text-slate-500">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className="h-11 rounded-none border-x-0 bg-slate-50 focus-visible:ring-0 focus-visible:border-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors focus:outline-hidden"
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full max-w-xs bg-blue-500 text-base font-semibold hover:bg-blue-600"
              >
                {loading ? "Signing in…" : "Sign In"}
              </Button>

              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                I forgot my password
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
