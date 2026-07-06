import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ holidays });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, date, description, type } = body;

  const holiday = await prisma.holiday.create({
    data: {
      name,
      date: new Date(date),
      description,
      type: type || "public",
    },
  });

  return NextResponse.json({ holiday }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.holiday.delete({ where: { id } });

  return NextResponse.json({ message: "Holiday deleted" });
}
