import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCompanySettings, isHoliday, isWeekend } from "@/lib/attendance";

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

  // Find today's attendance record
  const existing = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: today, lte: todayEnd } },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  // If there's an open session (clocked in but not clocked out) → reject
  if (existing) {
    const openSession = existing.sessions.find((s) => !s.clockOut);
    if (openSession) {
      return NextResponse.json({ error: "Already clocked in. Please clock out first." }, { status: 400 });
    }
  }

  const settings = await getCompanySettings();
  const weekend = isWeekend(now, settings.weeklyOff);
  const holiday = await isHoliday(now);

  let status = "present";
  if (weekend) status = "weekend";
  else if (holiday) status = "holiday";
  else {
    const [startHour, startMin] = settings.officeStartTime.split(":").map(Number);
    const officeStart = new Date(now);
    officeStart.setHours(startHour, startMin, 0, 0);
    const graceDeadline = new Date(officeStart.getTime() + settings.graceTimeMinutes * 60 * 1000);
    if (now > graceDeadline) status = "late";
  }

  // Upsert attendance record (keeps the same record for the whole day)
  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: { employeeId, date: today, status },
    update: {
      // Keep status as "late" if first clock-in was late
      status: existing?.status === "late" ? "late" : status,
    },
  });

  // Open a new session
  const newSession = await prisma.attendanceSession.create({
    data: {
      attendanceId: attendance.id,
      employeeId,
      clockIn: now,
    },
  });

  // Refresh with all sessions for response
  const updated = await prisma.attendance.findUnique({
    where: { id: attendance.id },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  return NextResponse.json({ attendance: updated, session: newSession, message: "Clocked in successfully" });
}
