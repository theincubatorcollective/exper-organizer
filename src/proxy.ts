import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/server/session";

// A cheap gate: it only checks that a session cookie exists. The backend still
// validates the token, and a 401 there sends the person back to sign in.
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(COOKIE.access)) return NextResponse.next();
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

// Every signed-in app section must be listed here. Routes outside this matcher
// can prerender without cookies and look "logged out" (redirect to sign-in).
export const config = {
  matcher: [
    "/overview/:path*",
    "/events/:path*",
    "/experience-builder/:path*",
    "/live-control/:path*",
    "/attendees/:path*",
    "/sales/:path*",
    "/moments/:path*",
    "/payouts/:path*",
    "/team/:path*",
    "/settings/:path*",
  ],
};
