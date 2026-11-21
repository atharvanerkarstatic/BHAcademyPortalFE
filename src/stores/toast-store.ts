import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastStoreState {
  toasts: Array<ToastMessage>;
  toast: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    }));
  },
  toast: ({ type = "info", title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).slice(2, 9);
    const nextToast: ToastMessage = { id, type, title, message, duration };

    set((state) => ({ toasts: [...state.toasts, nextToast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },
  success: (message, title) => {
    get().toast({ type: "success", title, message });
  },
  error: (message, title) => {
    get().toast({ type: "error", title, message });
  },
  info: (message, title) => {
    get().toast({ type: "info", title, message });
  },
}));
