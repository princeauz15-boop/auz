import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const admin = await p.admin.findFirst();
  console.log("Admin found:", admin ? admin.email : "NONE");
  const empCount = await p.employee.count();
  console.log("Employee count:", empCount);
} catch(e) {
  console.error("DB Error:", e.message);
} finally {
  await p.$disconnect();
}
