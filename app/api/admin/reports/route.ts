import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");

  let start: Date, end: Date;
  const now = new Date();

  if (startDate && endDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    switch (type) {
      case "weekly":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "yearly":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }
  }

  const where: any = {
    date: { gte: start, lte: end },
  };
  if (employeeId) where.employeeId = employeeId;

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          name: true,
          employeeId: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { employee: { name: "asc" } }],
  });

  // Summary stats
  const total = attendances.length;
  const present = attendances.filter((a) => ["present", "late", "half-day"].includes(a.status)).length;
  const absent = attendances.filter((a) => a.status === "absent").length;
  const late = attendances.filter((a) => a.status === "late").length;
  const halfDay = attendances.filter((a) => a.status === "half-day").length;
  const totalWorkingHours = attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0);
  const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);

  return NextResponse.json({
    attendances,
    summary: {
      total,
      present,
      absent,
      late,
      halfDay,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
    },
    period: { start, end, type },
  });
}
