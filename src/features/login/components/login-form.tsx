"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/features/auth/action";

export default function LoginForm({ ip }: { ip: ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (!email.trim() || !password) {
      setError("Please enter your email ID and password");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAction(email.trim(), password);
      if (result && !result.success) {
        setError(result.error ?? "Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as Record<string, unknown>).digest === "string" &&
        ((err as Record<string, unknown>).digest as string).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError("Something went wrong. Please try again.");
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
            Sign in to start your session
          </p>

          <div className="flex">
            <Input
              type="email"
              placeholder="Email ID"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-r-none bg-slate-50"
            />
            <span className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100">
              <Mail className="h-4 w-4" />
            </span>
          </div>

          <div className="flex">
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-r-none bg-slate-50"
            />
            <span className="flex w-12 items-center justify-center rounded-r-md border border-l-0 bg-slate-100">
              <Lock className="h-4 w-4" />
            </span>
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

              <a href="#" className="text-sm text-blue-600 hover:underline">
                I forgot my password
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
