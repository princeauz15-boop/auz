"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Edit, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  note: string | null;
  correctedAt: string | null;
  employee: {
    name: string;
    employeeId: string;
    department: string;
    designation: string;
  };
}

export default function AttendanceCorrectionPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editData, setEditData] = useState({ clockIn: "", clockOut: "", status: "", note: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate, limit: "100" });
    const res = await fetch(`/api/admin/attendance?${params}`);
    const data = await res.json();
    setRecords(data.attendances || []);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    const toLocal = (dt: string | null) => {
      if (!dt) return "";
      const d = new Date(dt);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };
    setEditData({
      clockIn: toLocal(record.clockIn),
      clockOut: toLocal(record.clockOut),
      status: record.status,
      note: record.note || "",
    });
  };

  const handleSave = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/attendance/${editRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        toast({ title: "Attendance corrected successfully!" });
        setEditRecord(null);
        fetchRecords();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter(
    (r) =>
      !search ||
      r.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Attendance Correction</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Admin can correct attendance records including clock-in/out times and status. All corrections are logged.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-44"
                />
              </div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
              <span className="text-gray-400 text-sm">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clock Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Corrected</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">No records found</td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(r.employee.name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-xs">{r.employee.name}</p>
                              <p className="text-xs text-gray-400">{r.employee.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{formatDate(r.date)}</td>
                        <td className="px-4 py-3 text-green-600 font-medium text-xs">{formatTime(r.clockIn)}</td>
                        <td className="px-4 py-3 text-red-500 font-medium text-xs">{formatTime(r.clockOut)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{formatDuration(r.workingHours || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.correctedAt ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Correct Attendance</DialogTitle>
            {editRecord && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {editRecord.employee.name} • {formatDate(editRecord.date)}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clock In</label>
              <Input
                type="datetime-local"
                value={editData.clockIn}
                onChange={(e) => setEditData((p) => ({ ...p, clockIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clock Out</label>
              <Input
                type="datetime-local"
                value={editData.clockOut}
                onChange={(e) => setEditData((p) => ({ ...p, clockOut: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <Select
                value={editData.status}
                onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="holiday">Holiday</option>
                <option value="weekend">Weekend</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note / Reason</label>
              <Input
                placeholder="Reason for correction..."
                value={editData.note}
                onChange={(e) => setEditData((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Working hours, overtime, and late minutes will be automatically recalculated based on the corrected times.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
