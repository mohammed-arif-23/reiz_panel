import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  return handleRouting(request);
}

export default middleware;

async function handleRouting(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files, API routes, and public assets should be bypassed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get("token")?.value;

  // Protected pages check
  const isAuthPage = pathname.startsWith("/login");
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/client");

  if (!tokenCookie) {
    if (isProtectedPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const payload = await verifyToken(tokenCookie);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Determine role-specific home portal
  let portalHome = "/dashboard";
  if (["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
    portalHome = "/admin";
  } else if (payload.role === "CLIENT") {
    portalHome = "/client";
  }

  // User is authenticated — redirect away from login
  if (isAuthPage || pathname === "/") {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin") && !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }

  // Client route protection
  if (pathname.startsWith("/client") && payload.role !== "CLIENT") {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
