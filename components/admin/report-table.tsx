"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatDuration, getStatusColor, getInitials } from "@/lib/utils";

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
  employee: {
    name: string;
    employeeId: string;
    department: string;
    designation: string;
  };
}

interface Summary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalWorkingHours: number;
  totalOvertime: number;
  attendancePercentage: number;
}

interface ReportTableProps {
  title: string;
  records: AttendanceRecord[];
  summary: Summary;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  showEmployee?: boolean;
  showDate?: boolean;
}

export function ReportTable({
  title,
  records,
  summary,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  showEmployee = true,
  showDate = true,
}: ReportTableProps) {
  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: summary.total, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Present", value: summary.present, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Absent", value: summary.absent, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Late", value: summary.late, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "Half Day", value: summary.halfDay, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
          {
            label: "Work Hours",
            value: formatDuration(summary.totalWorkingHours),
            color: "text-indigo-600",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
          },
          {
            label: "Overtime",
            value: formatDuration(summary.totalOvertime),
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
          },
          {
            label: "Attendance %",
            value: `${summary.attendancePercentage}%`,
            color: "text-teal-600",
            bg: "bg-teal-50 dark:bg-teal-900/20",
          },
        ].map((s) => (
          <div key={s.label} className={`p-3 rounded-xl ${s.bg}`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2 no-print">
        <Button variant="outline" size="sm" onClick={onExportExcel}>
          <Download className="w-4 h-4" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <FileText className="w-4 h-4" />
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="w-4 h-4" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6 print:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              {showEmployee && (
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
              )}
              {showDate && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Working Hrs</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Overtime</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">No records found for selected period</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {showEmployee && (
                    <td className="px-6 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(r.employee.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-xs">{r.employee.name}</p>
                          <p className="text-xs text-gray-400">{r.employee.department}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  {showDate && (
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{formatDate(r.date)}</td>
                  )}
                  <td className="px-4 py-2.5 text-green-600 font-medium text-xs">{formatTime(r.clockIn)}</td>
                  <td className="px-4 py-2.5 text-red-500 font-medium text-xs">{formatTime(r.clockOut)}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs">{formatDuration(r.workingHours || 0)}</td>
                  <td className="px-4 py-2.5 text-yellow-600 text-xs">{r.lateMinutes || 0}m</td>
                  <td className="px-4 py-2.5 text-purple-600 text-xs">{formatDuration(r.overtime || 0)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
