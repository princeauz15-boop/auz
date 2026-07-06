import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calculateAttendance, getCompanySettings, isHoliday, isWeekend } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employeeId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};

  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);
    where.date = { gte: d, lte: dEnd };
  } else if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const [attendances, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            department: true,
            designation: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { clockIn: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return NextResponse.json({ attendances, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { employeeId, date, clockIn, clockOut, status, note } = body;

  if (!employeeId || !date) {
    return NextResponse.json({ error: "Employee and date are required" }, { status: 400 });
  }

  // Check employee exists
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  // Check for duplicate
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: dateObj } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Attendance record already exists for this employee on this date" },
      { status: 409 }
    );
  }

  const settings = await getCompanySettings();

  // Auto-detect status for special days if not explicitly set
  let resolvedStatus = status;
  if (!resolvedStatus) {
    if (isWeekend(dateObj, settings.weeklyOff)) {
      resolvedStatus = "weekend";
    } else if (await isHoliday(dateObj)) {
      resolvedStatus = "holiday";
    } else {
      resolvedStatus = clockIn ? "present" : "absent";
    }
  }

  let attendanceData: any = {
    employeeId,
    date: dateObj,
    status: resolvedStatus,
    note: note || null,
    correctedBy: session.user.id,
    correctedAt: new Date(),
  };

  if (clockIn) {
    attendanceData.clockIn = new Date(clockIn);
  }
  if (clockOut) {
    attendanceData.clockOut = new Date(clockOut);
  }

  // Auto-calculate hours if both times provided
  if (clockIn && clockOut) {
    const calc = calculateAttendance(new Date(clockIn), new Date(clockOut), settings);
    attendanceData = {
      ...attendanceData,
      workingHours: calc.workingHours,
      lateMinutes: calc.lateMinutes,
      earlyLeaving: calc.earlyLeaving,
      overtime: calc.overtime,
      isHalfDay: calc.isHalfDay,
      status: status || calc.status,
    };
  }

  const attendance = await prisma.attendance.create({
    data: attendanceData,
    include: {
      employee: {
        select: { name: true, employeeId: true, department: true },
      },
    },
  });

  return NextResponse.json({ attendance }, { status: 201 });
}
