"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatTime, formatDuration, getStatusColor, getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  overtime: number | null;
  status: string;
  employee: {
    name: string;
    employeeId: string;
    department: string;
    designation: string;
  };
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
}

const STATUS_OPTIONS = ["present", "absent", "late", "half-day", "holiday", "weekend"];

const defaultForm = {
  employeeId: "",
  date: new Date().toISOString().split("T")[0],
  clockIn: "",
  clockOut: "",
  status: "present",
  note: "",
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    params.set("limit", "50");
    const res = await fetch(`/api/admin/attendance?${params}`);
    const data = await res.json();
    setRecords(data.attendances || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [date, status]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Load employees when dialog opens
  const openAdd = async () => {
    if (employees.length === 0) {
      const res = await fetch("/api/admin/employees?limit=200");
      const data = await res.json();
      setEmployees(data.employees || []);
    }
    setForm({ ...defaultForm, date });
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.employeeId) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }

    // Build datetime strings using the selected date + time inputs
    const buildDT = (timeStr: string) => {
      if (!timeStr) return "";
      return `${form.date}T${timeStr}:00`;
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          date: form.date,
          clockIn: form.clockIn ? buildDT(form.clockIn) : null,
          clockOut: form.clockOut ? buildDT(form.clockOut) : null,
          status: form.status,
          note: form.note || null,
        }),
      });

      if (res.ok) {
        toast({ title: "Attendance added successfully!" });
        setAddOpen(false);
        fetchAttendance();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = {
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    halfDay: records.filter((r) => r.status === "half-day").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Present", value: statusCounts.present, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Late", value: statusCounts.late, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "Absent", value: statusCounts.absent, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Half Day", value: statusCounts.halfDay, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>
              Attendance Records
              <span className="text-sm font-normal text-gray-400 ml-2">({total} records)</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto"
              />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
              </Select>
              <Button onClick={openAdd} size="sm">
                <Plus className="w-4 h-4" />
                Add Attendance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Working Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Late Min</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Overtime</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400">No attendance records for this date</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
                          <Plus className="w-4 h-4" />
                          Add First Record
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(record.employee.name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{record.employee.name}</p>
                              <p className="text-xs text-gray-400">{record.employee.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.employee.department}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{formatTime(record.clockIn)}</td>
                        <td className="px-4 py-3 text-red-500 font-medium">{formatTime(record.clockOut)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDuration(record.workingHours || 0)}</td>
                        <td className="px-4 py-3 text-yellow-600">{record.lateMinutes || 0}m</td>
                        <td className="px-4 py-3 text-purple-600">{formatDuration(record.overtime || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Attendance Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attendance</DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manually add an attendance record for an employee.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.employeeId}
                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                className="w-full"
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId}) — {emp.department}
                  </option>
                ))}
              </Select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            {/* Clock In / Out side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Clock In
                </label>
                <Input
                  type="time"
                  value={form.clockIn}
                  onChange={(e) => setForm((p) => ({ ...p, clockIn: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Clock Out
                </label>
                <Input
                  type="time"
                  value={form.clockOut}
                  onChange={(e) => setForm((p) => ({ ...p, clockOut: e.target.value }))}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </Select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note
              </label>
              <Input
                placeholder="Optional note or reason..."
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            {/* Auto-calc hint */}
            {form.clockIn && form.clockOut && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Working hours, overtime, and late minutes will be auto-calculated from the clock times.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
