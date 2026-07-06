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

  // Check if already clocked in today
  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: { gte: today, lte: todayEnd },
    },
  });

  if (existing) {
    if (existing.clockIn) {
      return NextResponse.json({ error: "Already clocked in today" }, { status: 400 });
    }
  }

  const settings = await getCompanySettings();
  const weekend = isWeekend(now, settings.weeklyOff);
  const holiday = await isHoliday(now);

  let status = "present";
  if (weekend) status = "weekend";
  else if (holiday) status = "holiday";
  else {
    // Check if late
    const [startHour, startMin] = settings.officeStartTime.split(":").map(Number);
    const officeStart = new Date(now);
    officeStart.setHours(startHour, startMin, 0, 0);
    const graceDeadline = new Date(officeStart.getTime() + settings.graceTimeMinutes * 60 * 1000);
    if (now > graceDeadline) status = "late";
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
    create: {
      employeeId,
      date: today,
      clockIn: now,
      status,
    },
    update: {
      clockIn: now,
      status,
    },
  });

  return NextResponse.json({ attendance, message: "Clocked in successfully" });
}
