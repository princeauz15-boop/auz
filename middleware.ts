import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Not logged in — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user?.role as string;

  // Employee trying to access admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url));
    }
  }

  // Admin trying to access employee routes
  if (pathname.startsWith("/employee") || pathname.startsWith("/api/employee")) {
    if (role !== "employee") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/employee/:path*",
    "/api/admin/:path*",
    "/api/employee/:path*",
  ],
};
