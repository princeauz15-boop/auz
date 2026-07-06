"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock, CheckCircle, TrendingUp, CalendarDays, Loader2, AlertCircle, LogIn, LogOut as LogOutIcon, Undo2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime, formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TodayAttendance {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  overtime: number | null;
  lateMinutes: number | null;
  status: string;
}

interface MonthlySummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalWorkingHours: number;
  totalOvertime: number;
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number | null>(null);
  const { toast } = useToast();

  // Live clock — ticks every second
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    const [todayRes, monthRes] = await Promise.all([
      fetch("/api/employee/attendance?type=today"),
      fetch("/api/employee/attendance"),
    ]);
    const [todayData, monthData] = await Promise.all([todayRes.json(), monthRes.json()]);
    setToday(todayData.attendances?.[0] || null);
    setSummary(monthData.summary || null);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 15-minute undo countdown after clock-out
  useEffect(() => {
    if (!today?.clockOut) { setUndoSecondsLeft(null); return; }
    const WINDOW = 15 * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((WINDOW - (Date.now() - new Date(today.clockOut!).getTime())) / 1000));
      setUndoSecondsLeft(remaining);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [today?.clockOut]);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const res = await fetch("/api/employee/clock-in", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Clocked In!", description: `Welcome, ${session?.user.name}! Have a productive day.` });
        fetchData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally { setClockLoading(false); }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      const res = await fetch("/api/employee/clock-out", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Clocked Out!", description: `Good work! You worked ${formatDuration(data.attendance?.workingHours || 0)}.` });
        fetchData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally { setClockLoading(false); }
  };

  const handleUndoClockOut = async () => {
    setUndoLoading(true);
    try {
      const res = await fetch("/api/employee/clock-out", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Clock-out undone!", description: "You can clock out again when you're ready." });
        fetchData();
      } else {
        toast({ title: "Cannot undo", description: data.error, variant: "destructive" });
      }
    } finally { setUndoLoading(false); }
  };

  // Format countdown as mm:ss
  const undoCountdown = (() => {
    if (!undoSecondsLeft || undoSecondsLeft <= 0) return null;
    const m = Math.floor(undoSecondsLeft / 60);
    const s = undoSecondsLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  })();

  // Live working hours while clocked in
  const liveWorkingHours = (() => {
    if (!today?.clockIn || today?.clockOut) return today?.workingHours || 0;
    return Math.max(0, (currentTime.getTime() - new Date(today.clockIn).getTime()) / (1000 * 60 * 60));
  })();

  const canClockIn = !today?.clockIn;
  const canClockOut = !!(today?.clockIn && !today?.clockOut);
  const canUndo = !!(today?.clockIn && today?.clockOut && undoCountdown);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero card ── */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left — date, clock, name */}
            <div>
              <p className="text-blue-200 text-sm mb-1">
                {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-4xl font-bold tracking-tight">
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </p>
              <p className="text-blue-200 mt-2 text-sm">
                Welcome back, <span className="font-semibold text-white">{session?.user.name}</span>
              </p>
              {today?.status && (
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  ["present", "late"].includes(today.status)
                    ? "bg-green-500/30 text-green-100"
                    : "bg-red-500/30 text-red-100"
                }`}>
                  {today.status}
                </span>
              )}
            </div>

            {/* Right — action buttons */}
            <div className="flex flex-col gap-3 sm:items-end">
              {canClockIn && (
                <Button onClick={handleClockIn} disabled={clockLoading}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 h-11">
                  {clockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Clock In
                </Button>
              )}

              {canClockOut && (
                <Button onClick={handleClockOut} disabled={clockLoading}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 h-11">
                  {clockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOutIcon className="w-4 h-4" />}
                  Clock Out
                </Button>
              )}

              {/* Shift done state */}
              {today?.clockIn && today?.clockOut && (
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-blue-200 text-xs">Shift completed</p>
                    <p className="text-white font-semibold">{formatDuration(today.workingHours || 0)}</p>
                  </div>

                  {/* Undo button — visible for 15 min after clock-out */}
                  {canUndo && (
                    <button
                      onClick={handleUndoClockOut}
                      disabled={undoLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {undoLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Undo2 className="w-3.5 h-3.5" />
                      }
                      Undo Clock-Out
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500/60 rounded text-xs tabular-nums">
                        {undoCountdown}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {!today && (
                <div className="flex items-center gap-2 text-blue-200 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Not checked in yet
                </div>
              )}
            </div>
          </div>

          {/* Bottom info bar */}
          {today?.clockIn && (
            <div className="mt-4 pt-4 border-t border-blue-500/30 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-blue-300 text-xs">Clock In</p>
                <p className="text-white font-semibold">{formatTime(today.clockIn)}</p>
              </div>
              {today.clockOut && (
                <div>
                  <p className="text-blue-300 text-xs">Clock Out</p>
                  <p className="text-white font-semibold">{formatTime(today.clockOut)}</p>
                </div>
              )}
              <div>
                <p className="text-blue-300 text-xs">{today.clockOut ? "Working Hours" : "Live Working Time"}</p>
                <p className="text-white font-semibold">{formatDuration(liveWorkingHours)}</p>
              </div>
              {(today.overtime || 0) > 0 && (
                <div>
                  <p className="text-blue-300 text-xs">Overtime</p>
                  <p className="text-yellow-300 font-semibold">+{formatDuration(today.overtime || 0)}</p>
                </div>
              )}
              {(today.lateMinutes || 0) > 0 && (
                <div>
                  <p className="text-blue-300 text-xs">Late By</p>
                  <p className="text-red-300 font-semibold">{today.lateMinutes}m</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly stats ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Present",    value: summary.present,                          icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20"  },
            { label: "Absent",     value: summary.absent,                           icon: AlertCircle,  color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20"      },
            { label: "Late",       value: summary.late,                             icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20"},
            { label: "Half Day",   value: summary.halfDay,                          icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20"},
            { label: "Work Hours", value: formatDuration(summary.totalWorkingHours),icon: Clock,        color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20"},
            { label: "Overtime",   value: formatDuration(summary.totalOvertime),    icon: TrendingUp,   color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20"},
          ].map((s) => (
            <Card key={s.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xs text-gray-400">This month</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
