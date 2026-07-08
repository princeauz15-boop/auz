"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, CalendarDays, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  type: string;
}

interface AttendanceSummary {
  date: string;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  public: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  optional: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function AdminCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", date: "", description: "", type: "public" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    const res = await fetch(`/api/admin/holidays?year=${year}`);
    const data = await res.json();
    setHolidays(data.holidays || []);
    setLoadingHolidays(false);
  }, [year]);

  const fetchSummaries = useCallback(async () => {
    setLoadingSummaries(true);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(year, month);
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const res = await fetch(`/api/admin/attendance?startDate=${startDate}&endDate=${endDate}&limit=1000`);
    const data = await res.json();

    // Group by date
    const map: Record<string, AttendanceSummary> = {};
    for (const a of data.attendances || []) {
      const d = a.date.split("T")[0];
      if (!map[d]) map[d] = { date: d, present: 0, absent: 0, late: 0, halfDay: 0, total: 0 };
      map[d].total++;
      if (a.status === "present") map[d].present++;
      else if (a.status === "absent") map[d].absent++;
      else if (a.status === "late") { map[d].late++; map[d].present++; }
      else if (a.status === "half-day") map[d].halfDay++;
    }
    setSummaries(Object.values(map));
    setLoadingSummaries(false);
  }, [year, month]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);
  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const holidayMap: Record<string, Holiday[]> = {};
  for (const h of holidays) {
    const d = h.date.split("T")[0];
    if (!holidayMap[d]) holidayMap[d] = [];
    holidayMap[d].push(h);
  }

  const summaryMap: Record<string, AttendanceSummary> = {};
  for (const s of summaries) {
    summaryMap[s.date] = s;
  }

  const handleAddHoliday = async () => {
    if (!addForm.name || !addForm.date) {
      toast({ title: "Name and date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        toast({ title: "Holiday added!" });
        setAddHolidayOpen(false);
        setAddForm({ name: "", date: "", description: "", type: "public" });
        fetchHolidays();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/holidays?id=${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Holiday removed" });
      fetchHolidays();
    } else {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const selectedDaySummary = selectedDay ? summaryMap[selectedDay] : null;
  const selectedDayHolidays = selectedDay ? (holidayMap[selectedDay] || []) : [];

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Upcoming holidays list (current month)
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-lg w-44 text-center text-gray-900 dark:text-white">
              {MONTHS[month]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
          >
            Today
          </Button>
        </div>
        <Button size="sm" onClick={() => {
          setAddForm({ name: "", date: selectedDay || toDateStr(year, month, 1), description: "", type: "public" });
          setAddHolidayOpen(true);
        }}>
          <Plus className="w-4 h-4" />
          Add Holiday
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {(loadingHolidays || loadingSummaries) ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(year, month, day);
                  const dayHolidays = holidayMap[dateStr] || [];
                  const summary = summaryMap[dateStr];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDay;
                  const isSunday = new Date(dateStr).getDay() === 0;
                  const isSaturday = new Date(dateStr).getDay() === 6;
                  const isWeekend = isSunday || isSaturday;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                      className={`
                        aspect-square rounded-lg p-1 text-left transition-all relative
                        ${isSelected ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}
                        ${isToday && !isSelected ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                        ${isWeekend && !isToday && !isSelected ? "bg-gray-50 dark:bg-gray-700/20" : ""}
                      `}
                    >
                      <span className={`text-xs font-semibold block mb-0.5 ${isToday && !isSelected ? "text-white" : isWeekend ? "text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>
                        {day}
                      </span>

                      {/* Holiday dot */}
                      {dayHolidays.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap">
                          {dayHolidays.map((h) => (
                            <span key={h.id} className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title={h.name} />
                          ))}
                        </div>
                      )}

                      {/* Attendance micro-bar */}
                      {summary && summary.total > 0 && (
                        <div className="mt-0.5 flex gap-0.5">
                          {summary.present > 0 && (
                            <div
                              className="h-1 rounded-full bg-green-500"
                              style={{ width: `${(summary.present / summary.total) * 100}%`, minWidth: 2 }}
                              title={`Present: ${summary.present}`}
                            />
                          )}
                          {summary.absent > 0 && (
                            <div
                              className="h-1 rounded-full bg-red-400"
                              style={{ width: `${(summary.absent / summary.total) * 100}%`, minWidth: 2 }}
                              title={`Absent: ${summary.absent}`}
                            />
                          )}
                          {summary.halfDay > 0 && (
                            <div
                              className="h-1 rounded-full bg-orange-400"
                              style={{ width: `${(summary.halfDay / summary.total) * 100}%`, minWidth: 2 }}
                              title={`Half Day: ${summary.halfDay}`}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Today</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Holiday</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-green-500 inline-block" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-red-400 inline-block" /> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-orange-400 inline-block" /> Half Day</span>
            </div>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selectedDay ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDayHolidays.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Holidays</p>
                    {selectedDayHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${HOLIDAY_TYPE_COLORS[h.type] || "bg-gray-100 text-gray-700"}`}>
                            {h.name}
                          </span>
                          {h.description && <p className="text-xs text-gray-400 mt-0.5">{h.description}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteId(h.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDaySummary ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Attendance</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                        <p className="text-green-700 dark:text-green-300 font-bold text-base">{selectedDaySummary.present}</p>
                        <p className="text-green-600 dark:text-green-400">Present</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                        <p className="text-red-700 dark:text-red-300 font-bold text-base">{selectedDaySummary.absent}</p>
                        <p className="text-red-600 dark:text-red-400">Absent</p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                        <p className="text-yellow-700 dark:text-yellow-300 font-bold text-base">{selectedDaySummary.late}</p>
                        <p className="text-yellow-600 dark:text-yellow-400">Late</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                        <p className="text-orange-700 dark:text-orange-300 font-bold text-base">{selectedDaySummary.halfDay}</p>
                        <p className="text-orange-600 dark:text-orange-400">Half Day</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> No attendance records
                  </p>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setAddForm({ name: "", date: selectedDay, description: "", type: "public" });
                    setAddHolidayOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Mark as Holiday
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-sm text-gray-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Click a day to see details
              </CardContent>
            </Card>
          )}

          {/* Month holidays list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Holidays in {MONTHS[month]}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHolidays ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : monthHolidays.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No holidays this month</p>
              ) : (
                <div className="space-y-2">
                  {monthHolidays.map((h) => (
                    <div key={h.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{h.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(h.date + (h.date.includes("T") ? "" : "T00:00:00")).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" · "}
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {h.type}
                          </Badge>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteId(h.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Diwali"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date <span className="text-red-500">*</span></label>
              <Input
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <Select
                value={addForm.type}
                onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full"
              >
                <option value="public">Public Holiday</option>
                <option value="optional">Optional Holiday</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <Input
                placeholder="Optional description"
                value={addForm.description}
                onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddHolidayOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAddHoliday} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Holiday</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to remove this holiday?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteHoliday}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
