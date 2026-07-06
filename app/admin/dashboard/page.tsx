"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, BarChart3, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatDuration, getStatusColor } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#f97316"];

interface DashboardData {
  stats: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    workingHours: number;
    overtime: number;
    attendancePercentage: number;
  };
  recentAttendance: Array<{
    id: string;
    clockIn: string | null;
    clockOut: string | null;
    workingHours: number;
    overtime: number;
    status: string;
    employee: {
      name: string;
      employeeId: string;
      department: string;
    };
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentAttendance } = data;

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      sub: "Active staff",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
      sub: `${stats.attendancePercentage}% of total`,
      trend: "up",
    },
    {
      label: "Absent Today",
      value: stats.absentToday,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      sub: `${100 - stats.attendancePercentage}% of total`,
    },
    {
      label: "Late Today",
      value: stats.lateToday,
      icon: AlertCircle,
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      sub: "Arrived late",
    },
    {
      label: "Working Hours",
      value: formatDuration(stats.workingHours),
      icon: Clock,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      sub: "Total today",
    },
    {
      label: "Overtime",
      value: formatDuration(stats.overtime),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      sub: "Extra hours",
    },
    {
      label: "Attendance %",
      value: `${stats.attendancePercentage}%`,
      icon: BarChart3,
      color: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      sub: "Today's rate",
    },
  ];

  // Pie chart data
  const pieData = [
    { name: "Present", value: stats.presentToday },
    { name: "Absent", value: stats.absentToday },
    { name: "Late", value: stats.lateToday },
  ];

  // Mock weekly chart data
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString("en", { weekday: "short" }),
      present: Math.floor(Math.random() * 20) + stats.presentToday - 5,
      absent: Math.floor(Math.random() * 5) + 2,
      late: Math.floor(Math.random() * 5) + 1,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                {card.trend && <ArrowUpRight className="w-3 h-3 text-green-500" />}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Overview Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance Overview (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Absent" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Attendance</CardTitle>
          <a href="/admin/attendance" className="text-xs text-blue-600 hover:underline">View All</a>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock In</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock Out</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">
                      No attendance records for today
                    </td>
                  </tr>
                ) : (
                  recentAttendance.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{record.employee.name}</p>
                          <p className="text-xs text-gray-400">{record.employee.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.employee.department}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{formatTime(record.clockIn)}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{formatTime(record.clockOut)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDuration(record.workingHours || 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
