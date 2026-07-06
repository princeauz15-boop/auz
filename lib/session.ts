import { auth } from "./auth";

// For API route handlers — uses next-auth v5 auth()
export async function getSessionFromRequest(_request?: unknown) {
  const session = await auth();
  if (!session) return null;
  return {
    user: {
      id: session.user?.id as string,
      email: session.user?.email as string,
      name: session.user?.name as string,
      role: session.user?.role as string,
      employeeId: session.user?.employeeId as string | undefined,
      department: session.user?.department as string | undefined,
      avatar: session.user?.avatar as string | undefined,
    },
  };
}

// For Server Components — uses next-auth v5 auth()
export async function getSessionFromHeaders() {
  const session = await auth();
  if (!session) return null;
  return session;
}
