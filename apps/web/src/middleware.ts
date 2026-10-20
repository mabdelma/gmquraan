import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, LOCALE_COOKIE, DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * On a visitor's first request (no locale cookie yet), detect the best language
 * from Accept-Language, set the cookie, and pass it forward as a request header
 * (x-app-locale) so the very first render is already localized.
 */
export function middleware(req: NextRequest) {
  // Central admin host → the console (the upstream platform-style host-based central).
  const host = (req.headers.get("host") || "").toLowerCase();
  if (host.startsWith("central.") && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/central", req.url));
  }
  // Partnership Hub host → the integrated /hub section (served from this same app).
  if (host.startsWith("passive.") && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/hub", req.url));
  }
  // GM-OS as a product → the /core section. A rewrite, not a redirect, so the
  // address stays core.* rather than bouncing a prospect onto the main site.
  if (host.startsWith("core.") && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/core", req.url));
  }

  // Always forward the current path so the layout can hide marketing chrome on app routes.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);

  if (req.cookies.has(LOCALE_COOKIE)) return NextResponse.next({ request: { headers } });

  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  let pick: string = DEFAULT_LOCALE;
  for (const part of accept.split(",")) {
    const base = part.split(";")[0].trim().split("-")[0];
    if ((LOCALES as readonly string[]).includes(base)) {
      pick = base;
      break;
    }
  }

  headers.set("x-app-locale", pick);
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(LOCALE_COOKIE, pick, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|native-bridge.js|offline.html).*)"],
};
