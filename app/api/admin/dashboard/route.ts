import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as any);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalEmployees,
    presentToday,
    lateToday,
    absentToday,
    todayAttendance,
    recentAttendance,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: "active" } }),
    prisma.attendance.count({
      where: {
        date: { gte: today, lte: todayEnd },
        status: { in: ["present", "late", "half-day"] },
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: today, lte: todayEnd },
        status: "late",
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: today, lte: todayEnd },
        status: "absent",
      },
    }),
    prisma.attendance.findMany({
      where: {
        date: { gte: today, lte: todayEnd },
      },
      select: {
        workingHours: true,
        overtime: true,
        status: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        date: { gte: today, lte: todayEnd },
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            department: true,
            avatar: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
      take: 10,
    }),
  ]);

  const totalWorkingHours = todayAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
  const totalOvertime = todayAttendance.reduce((sum, a) => sum + (a.overtime || 0), 0);
  const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  // Monthly chart data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthlyData = await prisma.attendance.groupBy({
    by: ["date", "status"],
    where: {
      date: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });

  return NextResponse.json({
    stats: {
      totalEmployees,
      presentToday,
      absentToday: totalEmployees - presentToday,
      lateToday,
      workingHours: Math.round(totalWorkingHours * 100) / 100,
      overtime: Math.round(totalOvertime * 100) / 100,
      attendancePercentage,
    },
    recentAttendance,
    monthlyData,
  });
}
