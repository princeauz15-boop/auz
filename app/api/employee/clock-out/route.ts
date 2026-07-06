import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCompanySettings, calculateAttendance } from "@/lib/attendance";

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
    where: {
      employeeId,
      date: { gte: today, lte: todayEnd },
    },
  });

  if (!attendance) {
    return NextResponse.json({ error: "You haven't clocked in today" }, { status: 400 });
  }

  if (!attendance.clockIn) {
    return NextResponse.json({ error: "Please clock in first" }, { status: 400 });
  }

  if (attendance.clockOut) {
    return NextResponse.json({ error: "Already clocked out today" }, { status: 400 });
  }

  const settings = await getCompanySettings();
  const calc = calculateAttendance(attendance.clockIn, now, settings);

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOut: now,
      workingHours: calc.workingHours,
      lateMinutes: calc.lateMinutes,
      earlyLeaving: calc.earlyLeaving,
      overtime: calc.overtime,
      isHalfDay: calc.isHalfDay,
      status: calc.status,
    },
  });

  return NextResponse.json({ attendance: updated, message: "Clocked out successfully" });
}

// Undo accidental clock-out — resets clockOut back to null so employee can continue working
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
    where: {
      employeeId,
      date: { gte: today, lte: todayEnd },
    },
  });

  if (!attendance) {
    return NextResponse.json({ error: "No attendance record found for today" }, { status: 404 });
  }

  if (!attendance.clockOut) {
    return NextResponse.json({ error: "You haven't clocked out yet" }, { status: 400 });
  }

  // Only allow undo within 15 minutes of clock-out
  const minutesSinceClockOut =
    (now.getTime() - new Date(attendance.clockOut).getTime()) / (1000 * 60);
  if (minutesSinceClockOut > 15) {
    return NextResponse.json(
      { error: "Undo is only allowed within 15 minutes of clock-out. Please contact admin for corrections." },
      { status: 400 }
    );
  }

  // Reset clock-out fields — employee can clock out again later
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOut: null,
      workingHours: null,
      earlyLeaving: null,
      overtime: null,
      isHalfDay: false,
      status: attendance.lateMinutes && attendance.lateMinutes > 0 ? "late" : "present",
    },
  });

  return NextResponse.json({ attendance: updated, message: "Clock-out undone. You can clock out again when ready." });
}

