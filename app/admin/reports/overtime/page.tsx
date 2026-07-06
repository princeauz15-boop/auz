"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Clock, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";
import { formatDuration, formatDate, getInitials } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface OvertimeRecord {
  employeeId: string;
  name: string;
  empId: string;
  department: string;
  totalOvertime: number;
  days: number;
  records: any[];
}

export default function OvertimeReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [overtimeData, setOvertimeData] = useState<OvertimeRecord[]>([]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const [year, mon] = month.split("-");
    const startDate = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${lastDay}`;
    const res = await fetch(`/api/admin/reports?type=monthly&startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    setData(json);

    // Aggregate overtime per employee
    const map: Record<string, OvertimeRecord> = {};
    (json.attendances || []).forEach((a: any) => {
      const eid = a.employee.employeeId;
      if (!map[eid]) {
        map[eid] = {
          employeeId: a.employeeId,
          name: a.employee.name,
          empId: eid,
          department: a.employee.department,
          totalOvertime: 0,
          days: 0,
          records: [],
        };
      }
      if (a.overtime && a.overtime > 0) {
        map[eid].totalOvertime += a.overtime;
        map[eid].days++;
        map[eid].records.push(a);
      }
    });
    setOvertimeData(
      Object.values(map)
        .filter((e) => e.totalOvertime > 0)
        .sort((a, b) => b.totalOvertime - a.totalOvertime)
    );
    setLoading(false);
  }, [month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const chartData = overtimeData.slice(0, 10).map((e) => ({
    name: e.name.split(" ")[0],
    overtime: Math.round(e.totalOvertime * 100) / 100,
  }));

  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  const exportOT = (format: "excel" | "csv" | "pdf") => {
    const rows = overtimeData.map((e) => ({
      Employee: e.name,
      "Employee ID": e.empId,
      Department: e.department,
      "Overtime Days": e.days,
      "Total Overtime": formatDuration(e.totalOvertime),
    }));
    if (format === "excel") {
      const XLSX = require("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Overtime");
      XLSX.writeFile(wb, `overtime_report_${month}.xlsx`);
    } else if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${(r as any)[h]}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `overtime_report_${month}.csv`;
      a.click();
    } else {
      exportToPDF(
        overtimeData.flatMap((e) => e.records),
        `Overtime Report - ${month}`,
        `overtime_report_${month}`
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <CardTitle>Overtime Report</CardTitle>
            </div>
            <div className="flex gap-2">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(overtimeData.reduce((s, e) => s + e.totalOvertime, 0))}
                  </p>
                  <p className="text-sm text-gray-500">Total Overtime</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{overtimeData.length}</p>
                  <p className="text-sm text-gray-500">Employees with OT</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">
                    {overtimeData.reduce((s, e) => s + e.days, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total OT Days</p>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v}h`, "Overtime"]} />
                    <Bar dataKey="overtime" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Export */}
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={() => exportOT("excel")}>
                  <Download className="w-4 h-4" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportOT("csv")}>
                  <Download className="w-4 h-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportOT("pdf")}>
                  <FileText className="w-4 h-4" /> PDF
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">OT Days</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-gray-400">No overtime records for this period</td>
                      </tr>
                    ) : (
                      overtimeData.map((e, i) => (
                        <tr key={e.empId} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              >
                                {getInitials(e.name)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{e.name}</p>
                                <p className="text-xs text-gray-400">{e.empId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.department}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.days} days</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-purple-600">{formatDuration(e.totalOvertime)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
