"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-fade-in rounded-lg p-4 shadow-lg border text-sm ${
            toast.variant === "destructive"
              ? "bg-red-600 text-white border-red-700"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
          }`}
        >
          {toast.title && <p className="font-semibold">{toast.title}</p>}
          {toast.description && <p className="mt-0.5 opacity-90">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
