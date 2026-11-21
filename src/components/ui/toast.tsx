"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";

export type { ToastMessage } from "@/stores/toast-store";

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <>
      {children}
      {/* Toast container: centered top, popping from top */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 left-1/2 z-[9999] flex max-h-screen w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4 sm:px-0"
      >
        {toasts.map((toastItem) => {
          const isSuccess = toastItem.type === "success";
          const isError = toastItem.type === "error";

          return (
            <output
              key={toastItem.id}
              className={cn(
                "animate-in slide-in-from-top-6 fade-in-0 pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300",
                isSuccess &&
                  "border-emerald-200 bg-white text-emerald-950 shadow-emerald-500/10",
                isError &&
                  "border-rose-200 bg-white text-rose-950 shadow-rose-500/10",
                !isSuccess &&
                  !isError &&
                  "border-slate-200 bg-white text-slate-900 shadow-slate-500/10"
              )}
            >
              <div className="shrink-0 pt-0.5">
                {isSuccess ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : null}
                {isError ? (
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                ) : null}
                {!isSuccess && !isError ? (
                  <Info className="h-5 w-5 text-blue-600" />
                ) : null}
              </div>

              <div className="flex-1 text-sm">
                {toastItem.title ? (
                  <p className="font-semibold">{toastItem.title}</p>
                ) : null}
                <p
                  className={
                    toastItem.title
                      ? "mt-0.5 text-xs text-slate-600"
                      : "leading-relaxed font-medium"
                  }
                >
                  {toastItem.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  removeToast(toastItem.id);
                }}
                className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Close toast"
              >
                <X className="h-4 w-4" />
              </button>
            </output>
          );
        })}
      </div>
    </>
  );
}

export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const success = useToastStore((state) => state.success);
  const error = useToastStore((state) => state.error);
  const info = useToastStore((state) => state.info);

  return { toast, success, error, info };
}
