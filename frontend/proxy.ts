import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages where an unauthenticated user is allowed.
const AUTH_PAGES   = new Set(["/", "/login", "/register"]);
const PUBLIC_PAGES = new Set(["/privacy", "/terms", "/admin"]);

/**
 * Edge-side auth gate. Runs before any page renders, so we can redirect
 * without flashing intermediate spinners or login screens.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip any request for a static file (anything with a `.` in the last
  // segment — e.g. /login-bg.png, /favicon.ico). This is a belt-and-braces
  // check on top of the matcher.
  if (pathname.includes(".")) return NextResponse.next();

  const hasToken = req.cookies.has("lbd_token");

  // Public marketing-style pages are always allowed.
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  // Logged-in user hitting an auth page → straight to dashboard.
  if (AUTH_PAGES.has(pathname)) {
    if (hasToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protected page without auth → bounce to login.
  if (!hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Skip Next.js internals and the Next image optimizer.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
