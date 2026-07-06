"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ReportTable } from "@/components/admin/report-table";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export";
import { formatDuration } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
}

export default function EmployeeReportPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/employees?limit=200")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees || []));
  }, []);

  const fetch_ = useCallback(async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    const [year, mon] = month.split("-");
    const startDate = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${lastDay}`;
    const res = await fetch(
      `/api/admin/reports?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee}`
    );
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [selectedEmployee, month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const emp = employees.find((e) => e.id === selectedEmployee);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <CardTitle>Employee Wise Report</CardTitle>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-48"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeId})
                  </option>
                ))}
              </Select>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedEmployee ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Select an employee to view their report</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : data ? (
            <div className="space-y-4">
              {emp && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{emp.employeeId} • {emp.department}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-gray-500">Attendance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{data.summary.attendancePercentage}%</p>
                  </div>
                </div>
              )}
              <ReportTable
                title={`${emp?.name} - ${month}`}
                records={data.attendances}
                summary={data.summary}
                showEmployee={false}
                onExportExcel={() => exportToExcel(data.attendances, `employee_${selectedEmployee}_${month}`)}
                onExportPDF={() => exportToPDF(data.attendances, `${emp?.name} Attendance Report - ${month}`, `employee_${selectedEmployee}_${month}`)}
                onExportCSV={() => exportToCSV(data.attendances, `employee_${selectedEmployee}_${month}`)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
