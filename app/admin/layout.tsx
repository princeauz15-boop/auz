"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { usePathname } from "next/navigation";

function getPageTitle(pathname: string): string {
  const routes: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/employees": "Employees",
    "/admin/employees/add": "Add Employee",
    "/admin/attendance": "Attendance",
    "/admin/attendance/correction": "Attendance Correction",
    "/admin/calendar": "Attendance Calendar",
    "/admin/reports/daily": "Daily Report",
    "/admin/reports/monthly": "Monthly Report",
    "/admin/reports/yearly": "Yearly Report",
    "/admin/reports/employee": "Employee Wise Report",
    "/admin/reports/overtime": "Overtime Report",
    "/admin/settings": "Settings",
    "/admin/holidays": "Holidays",
  };
  return routes[pathname] || "Admin Panel";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - desktop */}
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <AdminSidebar className="w-full" />
      </div>

      {/* Sidebar - mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 flex-shrink-0 z-10">
            <AdminSidebar className="w-full h-full" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminHeader
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title={getPageTitle(pathname)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
