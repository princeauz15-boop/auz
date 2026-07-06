"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStatusColor, formatTime, formatDuration } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  overtime: number | null;
  status: string;
}

export default function AttendanceCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/employee/attendance?month=${monthIndex + 1}&year=${year}`);
    const data = await res.json();
    setRecords(data.attendances || []);
    setLoading(false);
  }, [monthIndex, year]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const prev = () => {
    if (monthIndex === 0) { setMonthIndex(11); setYear((y) => y - 1); }
    else setMonthIndex((m) => m - 1);
  };

  const next = () => {
    if (monthIndex === 11) { setMonthIndex(0); setYear((y) => y + 1); }
    else setMonthIndex((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const recordMap: Record<string, AttendanceRecord> = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    recordMap[key] = r;
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const statusBg: Record<string, string> = {
    present: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
    late: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    absent: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",
    "half-day": "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700",
    holiday: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    weekend: "bg-gray-100 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{MONTHS[monthIndex]} {year}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMonthIndex(now.getMonth()); setYear(now.getFullYear()); }}
              >
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={next}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Present", color: "bg-green-100 text-green-700 border-green-200" },
              { label: "Late", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
              { label: "Absent", color: "bg-red-100 text-red-700 border-red-200" },
              { label: "Half Day", color: "bg-orange-100 text-orange-700 border-orange-200" },
              { label: "Holiday", color: "bg-purple-100 text-purple-700 border-purple-200" },
              { label: "Weekend", color: "bg-gray-100 text-gray-500 border-gray-200" },
            ].map((l) => (
              <span key={l.label} className={`px-2 py-0.5 rounded text-xs border ${l.color}`}>{l.label}</span>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const key = `${year}-${monthIndex}-${day}`;
                  const record = recordMap[key];
                  const isToday = year === now.getFullYear() && monthIndex === now.getMonth() && day === now.getDate();
                  const isFuture = new Date(year, monthIndex, day) > now;
                  return (
                    <button
                      key={day}
                      onClick={() => record && setSelected(record)}
                      className={`
                        relative p-1.5 rounded-lg text-center min-h-[52px] border transition-all text-xs
                        ${record ? `${statusBg[record.status] || statusBg.absent} cursor-pointer hover:opacity-80` : ""}
                        ${!record && !isFuture ? "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-800" : ""}
                        ${!record && isFuture ? "bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-700" : ""}
                        ${isToday ? "ring-2 ring-blue-500" : ""}
                      `}
                    >
                      <span className={`font-semibold ${isToday ? "text-blue-600" : ""}`}>{day}</span>
                      {record && (
                        <div className="mt-0.5">
                          <span className="text-xs font-medium block capitalize leading-tight">
                            {record.status === "half-day" ? "Half" : record.status.slice(0, 4)}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail popup */}
      {selected && (
        <Card className="border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {new Date(selected.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </CardTitle>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize mt-1 ${getStatusColor(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Clock In</p>
                <p className="font-semibold text-green-600">{formatTime(selected.clockIn)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Clock Out</p>
                <p className="font-semibold text-red-500">{formatTime(selected.clockOut)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Working Hours</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDuration(selected.workingHours || 0)}</p>
              </div>
              {(selected.lateMinutes || 0) > 0 && (
                <div>
                  <p className="text-gray-500 text-xs">Late By</p>
                  <p className="font-semibold text-yellow-600">{selected.lateMinutes}m</p>
                </div>
              )}
              {(selected.overtime || 0) > 0 && (
                <div>
                  <p className="text-gray-500 text-xs">Overtime</p>
                  <p className="font-semibold text-purple-600">+{formatDuration(selected.overtime || 0)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
