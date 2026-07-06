"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportTable } from "@/components/admin/report-table";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function MonthlyReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const [year, mon] = month.split("-");
    const startDate = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${lastDay}`;
    const res = await fetch(`/api/admin/reports?type=monthly&startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Build chart data grouped by date
  const chartData = (() => {
    if (!data?.attendances) return [];
    const map: Record<string, { date: string; present: number; absent: number; late: number }> = {};
    data.attendances.forEach((a: any) => {
      const d = a.date.split("T")[0];
      if (!map[d]) map[d] = { date: d, present: 0, absent: 0, late: 0 };
      if (["present", "late", "half-day"].includes(a.status)) map[d].present++;
      if (a.status === "absent") map[d].absent++;
      if (a.status === "late") map[d].late++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      ...d,
      date: new Date(d.date).getDate().toString(),
    }));
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <CardTitle>Monthly Attendance Report</CardTitle>
            </div>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : data ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} label={{ value: "Day", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} dot={false} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
                  <Line type="monotone" dataKey="late" stroke="#eab308" strokeWidth={2} dot={false} name="Late" />
                </LineChart>
              </ResponsiveContainer>
              <ReportTable
                title={`Monthly Report - ${month}`}
                records={data.attendances}
                summary={data.summary}
                onExportExcel={() => exportToExcel(data.attendances, `monthly_report_${month}`)}
                onExportPDF={() => exportToPDF(data.attendances, `Monthly Attendance Report - ${month}`, `monthly_report_${month}`)}
                onExportCSV={() => exportToCSV(data.attendances, `monthly_report_${month}`)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
