"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ReportTable } from "@/components/admin/report-table";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearlyReportPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?type=yearly&startDate=${year}-01-01&endDate=${year}-12-31`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const chartData = (() => {
    if (!data?.attendances) return [];
    const map: Record<number, { month: string; present: number; absent: number; late: number }> = {};
    for (let i = 0; i < 12; i++) map[i] = { month: MONTHS[i], present: 0, absent: 0, late: 0 };
    data.attendances.forEach((a: any) => {
      const m = new Date(a.date).getMonth();
      if (["present", "late", "half-day"].includes(a.status)) map[m].present++;
      else if (a.status === "absent") map[m].absent++;
      if (a.status === "late") map[m].late++;
    });
    return Object.values(map);
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle>Yearly Attendance Report</CardTitle>
            </div>
            <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-32">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : data ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#22c55e" name="Present" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="late" fill="#eab308" name="Late" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ReportTable
                title={`Yearly Report - ${year}`}
                records={data.attendances}
                summary={data.summary}
                onExportExcel={() => exportToExcel(data.attendances, `yearly_report_${year}`)}
                onExportPDF={() => exportToPDF(data.attendances, `Yearly Attendance Report - ${year}`, `yearly_report_${year}`)}
                onExportCSV={() => exportToCSV(data.attendances, `yearly_report_${year}`)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
