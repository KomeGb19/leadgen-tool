"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  title: string;
  variant: "default" | "success" | "error";
}

const ToastCtx = createContext<{
  push: (title: string, variant?: Toast["variant"]) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (title: string, variant: Toast["variant"] = "default") => {
      const id = Date.now();
      setToasts((t) => [...t, { id, title, variant }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded border px-4 py-2.5 font-mono text-xs shadow-card",
              t.variant === "success" && "border-ok/40 bg-white text-ok",
              t.variant === "error" && "border-danger/40 bg-white text-danger",
              t.variant === "default" && "border-line bg-white text-paper",
            )}
          >
            {t.title}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
