import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
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
  const isAuthPage = pathname === "/login";
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/client");

  // 1. Unauthenticated or missing token
  if (!tokenCookie) {
    if (isProtectedPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 2. Token exists — verify payload
  const payload = await verifyToken(tokenCookie);

  // If token is invalid or expired
  if (!payload) {
    // If already on login page, just clear invalid token and render page (NO redirect loop)
    if (isAuthPage) {
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    if (isProtectedPage) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("token");
    return response;
  }

  // 3. User is validly authenticated
  let portalHome = "/dashboard";
  if (["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
    portalHome = "/admin";
  } else if (payload.role === "CLIENT") {
    portalHome = "/client";
  }

  // If logged in user hits /login or /, redirect to their portal home
  if (isAuthPage || pathname === "/") {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }

  // Role permissions check
  if (pathname.startsWith("/admin") && !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }
  if (pathname.startsWith("/client") && payload.role !== "CLIENT") {
    return NextResponse.redirect(new URL(portalHome, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
