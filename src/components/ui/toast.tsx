"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({
      type = "info",
      title,
      message,
      duration = 4000,
    }: {
      type?: ToastType;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = React.useCallback(
    (message: string, title?: string) => toast({ type: "success", title, message }),
    [toast]
  );
  const error = React.useCallback(
    (message: string, title?: string) => toast({ type: "error", title, message }),
    [toast]
  );
  const info = React.useCallback(
    (message: string, title?: string) => toast({ type: "info", title, message }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container: centered top, popping from top */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex max-h-screen w-full max-w-md flex-col items-center gap-2 px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";

          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300 animate-in slide-in-from-top-6 fade-in-0",
                isSuccess && "border-emerald-200 bg-white text-emerald-950 shadow-emerald-500/10",
                isError && "border-rose-200 bg-white text-rose-950 shadow-rose-500/10",
                !isSuccess && !isError && "border-slate-200 bg-white text-slate-900 shadow-slate-500/10"
              )}
            >
              <div className="shrink-0 pt-0.5">
                {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {isError && <AlertCircle className="h-5 w-5 text-rose-600" />}
                {!isSuccess && !isError && <Info className="h-5 w-5 text-blue-600" />}
              </div>

              <div className="flex-1 text-sm">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className={t.title ? "mt-0.5 text-xs text-slate-600" : "font-medium leading-relaxed"}>{t.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close toast"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
