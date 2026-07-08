import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCompanySettings, calculateAttendance } from "@/lib/attendance";

// Helper: recalculate totals from all completed sessions
function recalcFromSessions(
  sessions: Array<{ clockIn: Date; clockOut: Date | null; durationHours: number | null }>,
  firstClockIn: Date,
  lastClockOut: Date,
  settings: Parameters<typeof calculateAttendance>[2]
) {
  const totalWorkingHours = sessions.reduce((sum, s) => {
    if (!s.clockOut) return sum;
    const dur = (s.clockOut.getTime() - s.clockIn.getTime()) / (1000 * 60 * 60);
    return sum + Math.max(0, dur);
  }, 0);

  // Use first clock-in and last clock-out for late/overtime calculations
  const calc = calculateAttendance(firstClockIn, lastClockOut, settings);

  return {
    workingHours: Math.round(totalWorkingHours * 100) / 100,
    lateMinutes: calc.lateMinutes,
    earlyLeaving: calc.earlyLeaving,
    overtime: Math.max(0, Math.round((totalWorkingHours - settings.standardWorkHours) * 100) / 100),
    isHalfDay: totalWorkingHours >= settings.halfDayHours && totalWorkingHours < settings.standardWorkHours,
    status: (() => {
      if (totalWorkingHours < settings.halfDayHours) return "absent";
      if (totalWorkingHours < settings.standardWorkHours) return "half-day";
      if (calc.lateMinutes > 0) return "late";
      return "present";
    })(),
  };
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const employeeId = session.user.id;

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: today, lte: todayEnd } },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  if (!attendance) {
    return NextResponse.json({ error: "You haven't clocked in today" }, { status: 400 });
  }

  // Find the open (active) session
  const openSession = attendance.sessions.find((s) => !s.clockOut);
  if (!openSession) {
    return NextResponse.json({ error: "No active clock-in found. Please clock in first." }, { status: 400 });
  }

  const settings = await getCompanySettings();

  // Close the open session
  const duration = (now.getTime() - openSession.clockIn.getTime()) / (1000 * 60 * 60);
  await prisma.attendanceSession.update({
    where: { id: openSession.id },
    data: {
      clockOut: now,
      durationHours: Math.round(Math.max(0, duration) * 100) / 100,
    },
  });

  // Fetch updated sessions
  const updatedSessions = await prisma.attendanceSession.findMany({
    where: { attendanceId: attendance.id },
    orderBy: { clockIn: "asc" },
  });

  const firstClockIn = updatedSessions[0].clockIn;
  const completedSessions = updatedSessions.filter((s) => s.clockOut);
  const calc = recalcFromSessions(completedSessions, firstClockIn, now, settings);

  // Update attendance totals
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockIn: firstClockIn,
      clockOut: now,
      workingHours: calc.workingHours,
      lateMinutes: calc.lateMinutes,
      earlyLeaving: calc.earlyLeaving,
      overtime: calc.overtime,
      isHalfDay: calc.isHalfDay,
      status: calc.status,
    },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  return NextResponse.json({ attendance: updated, message: "Clocked out successfully" });
}

// Undo last clock-out — reopens the most recent session within 15 min
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const employeeId = session.user.id;

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: today, lte: todayEnd } },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  if (!attendance) {
    return NextResponse.json({ error: "No attendance record found for today" }, { status: 404 });
  }

  // Find last completed session
  const lastSession = [...attendance.sessions].reverse().find((s) => s.clockOut);
  if (!lastSession) {
    return NextResponse.json({ error: "No completed session to undo" }, { status: 400 });
  }

  const minutesSince = (now.getTime() - new Date(lastSession.clockOut!).getTime()) / (1000 * 60);
  if (minutesSince > 15) {
    return NextResponse.json(
      { error: "Undo only allowed within 15 minutes of clock-out. Contact admin for corrections." },
      { status: 400 }
    );
  }

  // Reopen the session
  await prisma.attendanceSession.update({
    where: { id: lastSession.id },
    data: { clockOut: null, durationHours: 0 },
  });

  // Recalc attendance totals from remaining completed sessions
  const remainingSessions = attendance.sessions.filter(
    (s) => s.id !== lastSession.id && s.clockOut
  );

  let updateData: any = {
    clockOut: null,
    workingHours: 0,
    overtime: 0,
    earlyLeaving: 0,
    isHalfDay: false,
    status: attendance.lateMinutes && attendance.lateMinutes > 0 ? "late" : "present",
  };

  if (remainingSessions.length > 0) {
    const settings = await getCompanySettings();
    const firstIn = attendance.sessions[0].clockIn;
    const lastOut = remainingSessions[remainingSessions.length - 1].clockOut!;
    const calc = recalcFromSessions(remainingSessions, firstIn, lastOut, settings);
    updateData = { clockOut: null, ...calc };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: updateData,
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  return NextResponse.json({ attendance: updated, message: "Clock-out undone. You can clock out again when ready." });
}
