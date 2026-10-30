import { NextResponse, type NextRequest } from "next/server";

import { refreshTokens } from "@/lib/auth-api";
import {
  ACCESS_COOKIE,
  ALL_AUTH_COOKIES,
  REFRESH_COOKIE,
  buildAuthCookies,
  type TokenResponse,
} from "@/lib/auth-cookies";
import { extractAuthUser, hasPermission } from "@/lib/auth-jwt";

// Map routes to required permissions
const ROUTE_PERMISSIONS: { pattern: RegExp; permission: string | string[] }[] = [
  { pattern: /^\/faqs\/new(\/.*)?$/, permission: "faqs.create" },
  { pattern: /^\/faqs\/[^/]+\/edit(\/.*)?$/, permission: "faqs.update" },
  { pattern: /^\/faqs(\/.*)?$/, permission: "faqs.read" },
  { pattern: /^\/categories\/new(\/.*)?$/, permission: "categories.create" },
  { pattern: /^\/categories\/[^/]+\/edit(\/.*)?$/, permission: "categories.update" },
  { pattern: /^\/categories(\/.*)?$/, permission: "categories.read" },
  { pattern: /^\/courses(\/.*)?$/, permission: "courses.read" },
  { pattern: /^\/users(\/.*)?$/, permission: "users.read" },
  { pattern: /^\/accounts(\/.*)?$/, permission: "users.read" },
  { pattern: /^\/dashboard(\/.*)?$/, permission: "dashboard.read" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicAuthPage = pathname === "/login" || pathname === "/forgot-password";

  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let fresh: TokenResponse | null = null;
  let sessionExpired = false;

  if (!accessToken && refreshToken) {
    fresh = await refreshTokens(refreshToken);
    if (fresh) {
      accessToken = fresh.accessToken;
      request.cookies.set(ACCESS_COOKIE, fresh.accessToken);
      request.cookies.set(REFRESH_COOKIE, fresh.refreshToken);
    } else {
      sessionExpired = true; 
    }
  }

  const isLoggedIn = Boolean(accessToken);
  let response: NextResponse;

  if (!isLoggedIn) {
    if (isPublicAuthPage) response = NextResponse.next();
    else if (isApi) response = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    else response = NextResponse.redirect(new URL("/login", request.url));
  } else if (isPublicAuthPage || pathname === "/") {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    // Route-level permission authorization check
    const user = accessToken ? extractAuthUser(accessToken) : null;
    const userPerms = user ? [...user.roles, ...user.permissions] : [];

    let allowed = true;
    for (const rule of ROUTE_PERMISSIONS) {
      if (rule.pattern.test(pathname)) {
        if (!hasPermission(userPerms, rule.permission)) {
          allowed = false;
          break;
        }
      }
    }

    if (!allowed) {
      if (isApi) {
        response = NextResponse.json({ message: "Forbidden" }, { status: 403 });
      } else {
        // Redirect to dashboard with forbidden flag or access denied
        response = NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else {
      response = NextResponse.next({ request });
    }
  }

  if (fresh) {
    for (const c of buildAuthCookies(fresh)) response.cookies.set(c.name, c.value, c.options);
  }
  if (sessionExpired) {
    for (const name of ALL_AUTH_COOKIES) response.cookies.delete(name);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
