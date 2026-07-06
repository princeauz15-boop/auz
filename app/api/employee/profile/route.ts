import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as any);
  if (!session || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      designation: true,
      avatar: true,
      joiningDate: true,
      salary: true,
      status: true,
    },
  });

  return NextResponse.json({ employee });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, currentPassword, newPassword } = body;

  const updateData: any = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;

  if (newPassword && currentPassword) {
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const employee = await prisma.employee.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      designation: true,
      avatar: true,
      joiningDate: true,
      status: true,
    },
  });

  return NextResponse.json({ employee });
}
