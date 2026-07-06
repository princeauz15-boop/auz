import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calculateAttendance, getCompanySettings } from "@/lib/attendance";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { clockIn, clockOut, status, note } = body;

  const settings = await getCompanySettings();

  let updateData: any = {
    status,
    note,
    correctedBy: session.user.id,
    correctedAt: new Date(),
  };

  if (clockIn) {
    updateData.clockIn = new Date(clockIn);
  }
  if (clockOut) {
    updateData.clockOut = new Date(clockOut);
  }

  if (clockIn && clockOut) {
    const calc = calculateAttendance(new Date(clockIn), new Date(clockOut), settings);
    updateData = {
      ...updateData,
      workingHours: calc.workingHours,
      lateMinutes: calc.lateMinutes,
      earlyLeaving: calc.earlyLeaving,
      overtime: calc.overtime,
      isHalfDay: calc.isHalfDay,
      status: status || calc.status,
    };
  }

  const attendance = await prisma.attendance.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { name: true, employeeId: true, department: true },
      },
    },
  });

  return NextResponse.json({ attendance });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.attendance.delete({ where: { id } });

  return NextResponse.json({ message: "Attendance deleted" });
}
