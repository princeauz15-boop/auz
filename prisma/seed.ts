import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@smartattendance.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@smartattendance.com",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("Admin created:", admin.email);

  // Create company settings
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
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
  console.log("Company settings created");

  // Create holidays
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: "New Year's Day", date: new Date(`${currentYear}-01-01`) },
    { name: "Republic Day", date: new Date(`${currentYear}-01-26`) },
    { name: "Holi", date: new Date(`${currentYear}-03-25`) },
    { name: "Good Friday", date: new Date(`${currentYear}-04-18`) },
    { name: "Independence Day", date: new Date(`${currentYear}-08-15`) },
    { name: "Gandhi Jayanti", date: new Date(`${currentYear}-10-02`) },
    { name: "Diwali", date: new Date(`${currentYear}-11-01`) },
    { name: "Christmas Day", date: new Date(`${currentYear}-12-25`) },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: { id: `holiday-${holiday.name.replace(/\s+/g, "-").toLowerCase()}-${currentYear}` },
      update: {},
      create: {
        id: `holiday-${holiday.name.replace(/\s+/g, "-").toLowerCase()}-${currentYear}`,
        name: holiday.name,
        date: holiday.date,
        type: "public",
      },
    });
  }
  console.log("Holidays created");

  // Create sample employees
  const departments = ["Development", "Design", "HR", "Marketing", "Accounts", "Sales"];
  const designations = ["Senior Engineer", "Designer", "HR Manager", "Marketing Lead", "Accountant", "Sales Executive"];

  const employeeData = [
    { name: "Prince Patel", email: "prince@company.com", department: "Development", designation: "Senior Engineer", employeeId: "EMP001" },
    { name: "Rahul Sharma", email: "rahul@company.com", department: "Design", designation: "UI/UX Designer", employeeId: "EMP002" },
    { name: "Sneha Joshi", email: "sneha@company.com", department: "HR", designation: "HR Manager", employeeId: "EMP003" },
    { name: "Amit Kumar", email: "amit@company.com", department: "Marketing", designation: "Marketing Lead", employeeId: "EMP004" },
    { name: "Neha Singh", email: "neha@company.com", department: "Accounts", designation: "Accountant", employeeId: "EMP005" },
    { name: "Vikram Mehta", email: "vikram@company.com", department: "Development", designation: "Full Stack Developer", employeeId: "EMP006" },
    { name: "Priya Gupta", email: "priya@company.com", department: "Sales", designation: "Sales Executive", employeeId: "EMP007" },
    { name: "Rohit Verma", email: "rohit@company.com", department: "Development", designation: "Backend Developer", employeeId: "EMP008" },
  ];

  const empPassword = await bcrypt.hash("emp123", 12);

  for (const emp of employeeData) {
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        ...emp,
        password: empPassword,
        phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        joiningDate: new Date(`${currentYear - 1}-${String(Math.floor(1 + Math.random() * 12)).padStart(2, "0")}-01`),
        salary: 30000 + Math.floor(Math.random() * 70000),
        status: "active",
      },
    });
  }
  console.log("Employees created");

  console.log("Seeding complete!");
  console.log("\nLogin credentials:");
  console.log("Admin: admin@smartattendance.com / admin123");
  console.log("Employee: prince@company.com / emp123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
