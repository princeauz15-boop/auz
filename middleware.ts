import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Not logged in — redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role as string;

  // Employee trying to access admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }
  }

  // Admin trying to access employee routes
  if (pathname.startsWith("/employee") || pathname.startsWith("/api/employee")) {
    if (role !== "employee") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/employee/:path*",
    "/api/admin/:path*",
    "/api/employee/:path*",
  ],
};
