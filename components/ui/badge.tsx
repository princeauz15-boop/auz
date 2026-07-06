import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    secondary: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    destructive: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    outline: "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
