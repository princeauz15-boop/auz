import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
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

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

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
  const { name, email, phone, department, designation, joiningDate, salary, status, password } = body;

  const updateData: any = {
    name,
    email,
    phone,
    department,
    designation,
    joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    salary: salary ? parseFloat(salary) : null,
    status,
  };

  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      designation: true,
      joiningDate: true,
      salary: true,
      status: true,
    },
  });

  return NextResponse.json({ employee });
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
  await prisma.employee.delete({ where: { id } });

  return NextResponse.json({ message: "Employee deleted successfully" });
}
