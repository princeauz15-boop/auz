import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type") || "monthly";

  const employeeId = session.user.id;
  const now = new Date();

  let start: Date, end: Date;

  if (month && year) {
    start = new Date(parseInt(year), parseInt(month) - 1, 1);
    end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
  } else if (type === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else {
    // Current month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "desc" },
    include: { sessions: { orderBy: { clockIn: "asc" } } },
  });

  // Summary
  const present = attendances.filter((a) => ["present", "late"].includes(a.status)).length;
  const absent = attendances.filter((a) => a.status === "absent").length;
  const late = attendances.filter((a) => a.status === "late").length;
  const halfDay = attendances.filter((a) => a.status === "half-day").length;
  const totalWorkingHours = attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0);
  const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);

  return NextResponse.json({
    attendances,
    summary: {
      present,
      absent,
      late,
      halfDay,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
    },
  });
}
