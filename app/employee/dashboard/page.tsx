"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Clock, CheckCircle, TrendingUp, CalendarDays,
  Loader2, AlertCircle, LogIn, LogOut as LogOutIcon, Undo2, Coffee,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime, formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AttendanceSession {
  id: string;
  clockIn: string;
  clockOut: string | null;
  durationHours: number | null;
}

interface TodayAttendance {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  overtime: number | null;
  lateMinutes: number | null;
  status: string;
  sessions: AttendanceSession[];
}

interface MonthlySummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalWorkingHours: number;
  totalOvertime: number;
}

/** Format minutes as "Xh Ym" or "Ym" */
function fmtMinutes(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Gap in minutes between two ISO strings */
function gapMinutes(outIso: string, inIso: string): number {
  return Math.round((new Date(inIso).getTime() - new Date(outIso).getTime()) / 60000);
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

  // 15-min undo countdown — triggered by the last session's clockOut
  const lastClockOutIso = today?.sessions
    ? [...today.sessions].reverse().find((s) => s.clockOut)?.clockOut ?? null
    : null;

  useEffect(() => {
    if (!lastClockOutIso) { setUndoSecondsLeft(null); return; }
    const WINDOW = 15 * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((WINDOW - (Date.now() - new Date(lastClockOutIso).getTime())) / 1000)
      );
      setUndoSecondsLeft(remaining);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lastClockOutIso]);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const res = await fetch("/api/employee/clock-in", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Clocked In!", description: `Session ${(today?.sessions?.length ?? 0) + 1} started.` });
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
        toast({ title: "Clocked Out!", description: `Total: ${formatDuration(data.attendance?.workingHours || 0)}` });
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
        toast({ title: "Clock-out undone!", description: "You can clock out again when ready." });
        fetchData();
      } else {
        toast({ title: "Cannot undo", description: data.error, variant: "destructive" });
      }
    } finally { setUndoLoading(false); }
  };

  // Undo countdown mm:ss
  const undoCountdown = (() => {
    if (!undoSecondsLeft || undoSecondsLeft <= 0) return null;
    const m = Math.floor(undoSecondsLeft / 60);
    const s = undoSecondsLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  })();

  const sessions = today?.sessions ?? [];
  const openSession = sessions.find((s) => !s.clockOut) ?? null;
  const hasOpenSession = !!openSession;
  const hasAnySessions = sessions.length > 0;

  // canClockIn: no sessions at all, OR last session is closed
  const canClockIn = !hasOpenSession;
  // canClockOut: there's an open session
  const canClockOut = hasOpenSession;
  const canUndo = !!(lastClockOutIso && undoCountdown);

  // Live working hours: completed sessions + current open session time
  const completedHours = sessions
    .filter((s) => s.clockOut)
    .reduce((sum, s) => sum + (s.durationHours ?? 0), 0);

  const liveCurrentSession = openSession
    ? (currentTime.getTime() - new Date(openSession.clockIn).getTime()) / (1000 * 60 * 60)
    : 0;

  const totalLiveHours = completedHours + liveCurrentSession;

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
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

            {/* Left — date, clock, name, status */}
            <div>
              <p className="text-blue-200 text-sm mb-1">
                {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-4xl font-bold tracking-tight tabular-nums">
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </p>
              <p className="text-blue-200 mt-2 text-sm">
                Welcome back, <span className="font-semibold text-white">{session?.user.name}</span>
              </p>
              {today?.status && (
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  ["present", "late"].includes(today.status)
                    ? "bg-green-500/30 text-green-100"
                    : today.status === "half-day"
                    ? "bg-orange-500/30 text-orange-100"
                    : "bg-red-500/30 text-red-100"
                }`}>
                  {today.status}
                </span>
              )}
            </div>

            {/* Right — buttons + totals */}
            <div className="flex flex-col gap-2 sm:items-end">

              {/* Total hours while working */}
              {hasAnySessions && (
                <div className="text-right mb-1">
                  <p className="text-blue-200 text-xs">
                    {hasOpenSession ? "Live Working Time" : "Total Worked"}
                  </p>
                  <p className="text-white font-bold text-xl tabular-nums">
                    {formatDuration(totalLiveHours)}
                  </p>
                  {sessions.length > 1 && (
                    <p className="text-blue-200 text-xs">{sessions.length} sessions</p>
                  )}
                </div>
              )}

              {/* Clock In */}
              <Button
                onClick={handleClockIn}
                disabled={clockLoading || !canClockIn}
                className={`font-semibold px-6 h-11 gap-2 transition-all w-full sm:w-auto ${
                  canClockIn
                    ? "bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                    : "bg-white/15 text-white/40 cursor-not-allowed border border-white/20"
                }`}
              >
                {clockLoading && canClockIn
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <LogIn className="w-4 h-4" />}
                {sessions.length > 0 && canClockIn ? "Clock In Again" : "Clock In"}
              </Button>

              {/* Clock Out */}
              <Button
                onClick={handleClockOut}
                disabled={clockLoading || !canClockOut}
                className={`font-semibold px-6 h-11 gap-2 transition-all w-full sm:w-auto ${
                  canClockOut
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                    : "bg-white/15 text-white/40 cursor-not-allowed border border-white/20"
                }`}
              >
                {clockLoading && canClockOut
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <LogOutIcon className="w-4 h-4" />}
                Clock Out
              </Button>

              {/* Undo */}
              {canUndo && (
                <button
                  onClick={handleUndoClockOut}
                  disabled={undoLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-medium transition-colors disabled:opacity-60"
                >
                  {undoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  Undo Clock-Out
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500/60 rounded text-xs tabular-nums">{undoCountdown}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Session Timeline ── */}
          {sessions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-blue-500/30">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">
                Today&apos;s Timeline
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {sessions.map((s, idx) => {
                  const isOpen = !s.clockOut;
                  const dur = isOpen
                    ? (currentTime.getTime() - new Date(s.clockIn).getTime()) / 60000
                    : s.durationHours != null
                    ? s.durationHours * 60
                    : null;

                  // Break gap before this session
                  const prevSession = idx > 0 ? sessions[idx - 1] : null;
                  const breakMins =
                    prevSession?.clockOut ? gapMinutes(prevSession.clockOut, s.clockIn) : null;

                  return (
                    <div key={s.id} className="flex items-center gap-1.5">
                      {/* Break pill between sessions */}
                      {breakMins !== null && breakMins > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/25 border border-orange-400/40 text-orange-200 text-xs font-medium">
                          <Coffee className="w-3 h-3" />
                          Break {fmtMinutes(breakMins)}
                        </div>
                      )}

                      {/* Session block */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                        isOpen
                          ? "bg-green-500/25 border-green-400/50 text-green-100"
                          : "bg-white/15 border-white/25 text-white"
                      }`}>
                        {/* Session number */}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isOpen ? "bg-green-400 text-green-900" : "bg-white/30 text-white"
                        }`}>
                          {idx + 1}
                        </span>

                        {/* IN time */}
                        <span className="text-green-300 font-semibold">
                          IN {formatTime(s.clockIn)}
                        </span>

                        <span className="text-white/40">→</span>

                        {/* OUT time or live */}
                        {isOpen ? (
                          <span className="text-green-200 animate-pulse font-semibold tabular-nums">
                            {formatTime(currentTime.toISOString())} ●
                          </span>
                        ) : (
                          <span className="text-red-300 font-semibold">
                            OUT {formatTime(s.clockOut!)}
                          </span>
                        )}

                        {/* Duration */}
                        {dur !== null && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isOpen ? "bg-green-400/30 text-green-100" : "bg-white/20 text-white"
                          }`}>
                            {fmtMinutes(Math.round(dur))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live total at end */}
                {sessions.length > 1 && (
                  <div className="flex items-center gap-1 ml-1 px-3 py-1.5 rounded-xl bg-blue-500/30 border border-blue-400/40 text-blue-100 text-xs font-bold">
                    <Clock className="w-3 h-3" />
                    Total {formatDuration(totalLiveHours)}
                  </div>
                )}
              </div>

              {/* Late / overtime badges below timeline */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {(today?.lateMinutes ?? 0) > 0 && (
                  <span className="text-red-300">
                    Late by <span className="font-semibold">{fmtMinutes(today!.lateMinutes!)}</span>
                  </span>
                )}
                {(today?.overtime ?? 0) > 0 && (
                  <span className="text-yellow-300">
                    Overtime <span className="font-semibold">+{formatDuration(today!.overtime!)}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* No sessions yet */}
          {!hasAnySessions && (
            <div className="mt-4 pt-4 border-t border-blue-500/30 flex items-center gap-2 text-blue-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              Not checked in yet today
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly stats ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Present",    value: summary.present,                           icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20"  },
            { label: "Absent",     value: summary.absent,                            icon: AlertCircle, color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20"      },
            { label: "Late",       value: summary.late,                              icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20"},
            { label: "Half Day",   value: summary.halfDay,                           icon: CalendarDays,color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20"},
            { label: "Work Hours", value: formatDuration(summary.totalWorkingHours), icon: Clock,       color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20"},
            { label: "Overtime",   value: formatDuration(summary.totalOvertime),     icon: TrendingUp,  color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20"},
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
