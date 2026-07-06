import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { auth } from "./auth";

// For API route handlers (have access to NextRequest)
export async function getSessionFromRequest(request: NextRequest | Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) return null;
  return {
    user: {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      role: token.role as string,
      employeeId: token.employeeId as string | undefined,
      department: token.department as string | undefined,
      avatar: token.avatar as string | undefined,
    },
  };
}

// For Server Components — uses next-auth v5 auth()
export async function getSessionFromHeaders() {
  const session = await auth();
  if (!session) return null;
  return session;
}
