import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as any);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        id: "default",
        companyName: "Smart Attendance Co.",
        officeStartTime: "09:00",
        officeEndTime: "18:00",
        standardWorkHours: 8,
        graceTimeMinutes: 15,
        weeklyOff: "Saturday,Sunday",
        halfDayHours: 4,
      },
    });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  let settings = await prisma.companySettings.findFirst();

  if (settings) {
    settings = await prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        companyName: body.companyName,
        officeStartTime: body.officeStartTime,
        officeEndTime: body.officeEndTime,
        standardWorkHours: parseFloat(body.standardWorkHours),
        graceTimeMinutes: parseInt(body.graceTimeMinutes),
        weeklyOff: body.weeklyOff,
        halfDayHours: parseFloat(body.halfDayHours),
      },
    });
  } else {
    settings = await prisma.companySettings.create({
      data: {
        id: "default",
        ...body,
        standardWorkHours: parseFloat(body.standardWorkHours),
        graceTimeMinutes: parseInt(body.graceTimeMinutes),
        halfDayHours: parseFloat(body.halfDayHours),
      },
    });
  }

  return NextResponse.json({ settings });
}
