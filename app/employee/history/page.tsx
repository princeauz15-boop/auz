"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Download, FileText, History, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatDuration, getStatusColor } from "@/lib/utils";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  earlyLeaving: number | null;
  overtime: number | null;
  status: string;
}

export default function HistoryPage() {
  const now = new Date();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState<any>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const [year, mon] = month.split("-");
    const res = await fetch(`/api/employee/attendance?month=${mon}&year=${year}`);
    const data = await res.json();
    setRecords(data.attendances || []);
    setSummary(data.summary);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = statusFilter ? records.filter((r) => r.status === statusFilter) : records;
  const exportRecords = filtered.map((r) => ({
    ...r,
    employee: { name: "", employeeId: "", department: "", designation: "" },
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary quick stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Present", value: summary.present, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Absent", value: summary.absent, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
            { label: "Total Hours", value: formatDuration(summary.totalWorkingHours), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Overtime", value: formatDuration(summary.totalOvertime), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
          ].map((s) => (
            <div key={s.label} className={`p-3 rounded-xl ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <CardTitle>Attendance History</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => exportToExcel(exportRecords, `attendance_history_${month}`)}>
                <Download className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF(exportRecords, `Attendance History - ${month}`, `attendance_history_${month}`)}>
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Day</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Working Hrs</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Overtime</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const d = new Date(r.date);
                      const dayName = d.toLocaleDateString("en", { weekday: "short" });
                      return (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{formatDate(r.date)}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{dayName}</td>
                          <td className="px-4 py-3 text-green-600 font-medium">{formatTime(r.clockIn)}</td>
                          <td className="px-4 py-3 text-red-500 font-medium">{formatTime(r.clockOut)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDuration(r.workingHours || 0)}</td>
                          <td className="px-4 py-3 text-yellow-600">{r.lateMinutes ? `${r.lateMinutes}m` : "-"}</td>
                          <td className="px-4 py-3 text-purple-600">{r.overtime ? formatDuration(r.overtime) : "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(r.status)}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
