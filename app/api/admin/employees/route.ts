import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { employeeId: { contains: search } },
    ];
  }
  if (department) where.department = department;
  if (status) where.status = status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({ employees, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, department, designation, joiningDate, salary, password } = body;

  if (!name || !email || !department || !designation || !joiningDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  // Generate employee ID
  const count = await prisma.employee.count();
  const employeeId = `EMP${String(count + 1).padStart(3, "0")}`;

  const hashedPassword = await bcrypt.hash(password || "emp123", 12);

  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      phone,
      department,
      designation,
      joiningDate: new Date(joiningDate),
      salary: salary ? parseFloat(salary) : null,
      password: hashedPassword,
      employeeId,
    },
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

  return NextResponse.json({ employee }, { status: 201 });
}
