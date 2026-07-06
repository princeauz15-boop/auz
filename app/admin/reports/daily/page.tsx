"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportTable } from "@/components/admin/report-table";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?type=daily&startDate=${date}&endDate=${date}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const barData = data
    ? [
        { name: "Present", value: data.summary.present, fill: "#22c55e" },
        { name: "Absent", value: data.summary.absent, fill: "#ef4444" },
        { name: "Late", value: data.summary.late, fill: "#eab308" },
        { name: "Half Day", value: data.summary.halfDay, fill: "#f97316" },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <CardTitle>Daily Attendance Report</CardTitle>
            </div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : data ? (
            <div className="space-y-6">
              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {barData.map((d, i) => (
                      <rect key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ReportTable
                title={`Daily Report - ${date}`}
                records={data.attendances}
                summary={data.summary}
                onExportExcel={() => exportToExcel(data.attendances, `daily_report_${date}`)}
                onExportPDF={() => exportToPDF(data.attendances, `Daily Attendance Report - ${date}`, `daily_report_${date}`)}
                onExportCSV={() => exportToCSV(data.attendances, `daily_report_${date}`)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
