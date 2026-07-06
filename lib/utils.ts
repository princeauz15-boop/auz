import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return "0h 0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    present: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    "half-day": "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    weekend: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
  };
  return colors[status] || colors.absent;
}

export function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    Development: "bg-blue-100 text-blue-700",
    Design: "bg-purple-100 text-purple-700",
    HR: "bg-pink-100 text-pink-700",
    Marketing: "bg-orange-100 text-orange-700",
    Accounts: "bg-green-100 text-green-700",
    Sales: "bg-yellow-100 text-yellow-700",
  };
  return colors[department] || "bg-gray-100 text-gray-700";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
