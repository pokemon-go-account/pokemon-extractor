import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // 1. Allow public auth endpoints and assets freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/me")
  ) {
    return response;
  }

  // 2. Checker push API requires valid x-api-key (verified in route)
  if (pathname === "/api/accounts/push") {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing x-api-key header." }, { status: 401 });
    }
    return response;
  }

  // 3. For protected API routes: verify session cookie, authorization header, or live SSE token
  if (
    pathname.startsWith("/api/accounts") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/import")
  ) {
    const cookieToken = request.cookies.get("poke_vault_token")?.value;
    const authHeader = request.headers.get("authorization");
    const queryToken = pathname === "/api/accounts/live" ? request.nextUrl.searchParams.get("token") : null;

    const hasToken = Boolean(
      cookieToken ||
      (authHeader && authHeader.startsWith("Bearer ")) ||
      queryToken
    );

    if (!hasToken) {
      return NextResponse.json(
        { error: "Unauthorized: Active operator session required." },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
