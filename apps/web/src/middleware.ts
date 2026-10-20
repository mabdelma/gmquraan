import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based routing for the app subdomains, plus forwarding the request path so
 * the layout can hide marketing chrome on app routes.
 *
 * There is no locale detection here any more: the site is Arabic-only and the
 * rendered locale is pinned in i18n.server.ts, so sniffing Accept-Language and
 * setting an `app_locale` cookie would only set a value nothing reads.
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
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|native-bridge.js|offline.html).*)"],
};
