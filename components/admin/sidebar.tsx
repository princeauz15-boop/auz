"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, BarChart3,
  Settings, LogOut, ChevronRight, Building2, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  {
    label: "MAIN",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        label: "Employees",
        icon: Users,
        children: [
          { href: "/admin/employees", label: "All Employees" },
          { href: "/admin/employees/add", label: "Add Employee" },
        ],
      },
      {
        label: "Attendance",
        icon: Clock,
        children: [
          { href: "/admin/attendance", label: "Today's Attendance" },
          { href: "/admin/attendance/correction", label: "Attendance Correction" },
        ],
      },
      { href: "/admin/calendar", label: "Attendance Calendar", icon: CalendarDays },
      {
        label: "Reports",
        icon: BarChart3,
        children: [
          { href: "/admin/reports/daily", label: "Daily Report" },
          { href: "/admin/reports/monthly", label: "Monthly Report" },
          { href: "/admin/reports/yearly", label: "Yearly Report" },
          { href: "/admin/reports/employee", label: "Employee Wise" },
          { href: "/admin/reports/overtime", label: "Overtime Report" },
        ],
      },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState<string[]>(["Employees", "Attendance", "Reports"]);

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isGroupActive = (children: Array<{ href: string }>) =>
    children.some((c) => isActive(c.href));

  return (
    <aside className={cn("flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700", className)}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white">Smart Attendance</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navItems.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if ("href" in item) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                }

                const isOpen = expanded.includes(item.label);
                const active = item.children && isGroupActive(item.children);

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                        active
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && item.children && (
                      <div className="ml-7 mt-0.5 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              isActive(child.href)
                                ? "bg-blue-600 text-white"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <ChevronRight className="w-3 h-3" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Personal section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
            PERSONAL
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}
