"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastId = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(newToasts: Toast[]) {
  toasts = newToasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<Toast, "id">) {
  const id = String(++toastId);
  const newToast = { ...props, id };
  dispatch([...toasts, newToast]);

  setTimeout(() => {
    dispatch(toasts.filter((t) => t.id !== id));
  }, 4000);
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

  const subscribe = useCallback(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts([...newToasts]);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  // Subscribe on mount
  if (typeof window !== "undefined" && !listeners.some((l) => l.toString().includes("setCurrentToasts"))) {
    const listener = (newToasts: Toast[]) => setCurrentToasts([...newToasts]);
    listeners.push(listener);
  }

  return {
    toast,
    toasts: currentToasts,
  };
}
