import { NextResponse, type NextRequest } from "next/server";

import { refreshTokens } from "@/lib/auth-api";
import {
  ACCESS_COOKIE,
  ALL_AUTH_COOKIES,
  AUTH_UPDATED_COOKIE,
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
  { pattern: /^\/accounts(\/.*)?$/, permission: ["accounts.read", "users.read"] },
  { pattern: /^\/trainers(\/.*)?$/, permission: ["users.read", "ROLE_TRAINER"] },
  { pattern: /^\/assessments\/send(\/.*)?$/, permission: ["assessments.create", "courses.read"] },
  { pattern: /^\/assessments\/links(\/.*)?$/, permission: ["assessments.read", "courses.read"] },
  { pattern: /^\/assessments\/results(\/.*)?$/, permission: ["assessments.read", "audit.read"] },
  { pattern: /^\/reports(\/.*)?$/, permission: ["reports.read", "audit.read"] },
  { pattern: /^\/roles(\/.*)?$/, permission: "roles.read" },
  { pattern: /^\/admin-users(\/.*)?$/, permission: "users.read" },
  { pattern: /^\/cities(\/.*)?$/, permission: ["pincode.read", "system.all"] },
  { pattern: /^\/report-scheduler(\/.*)?$/, permission: "system.all" },
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

  // Validate current access token
  let currentUser = accessToken ? extractAuthUser(accessToken) : null;
  if (accessToken && !currentUser) {
    // Access token is present but expired or malformed
    accessToken = undefined;
  }

  // If no valid access token but refreshToken exists, try to refresh
  if (!accessToken && refreshToken) {
    fresh = await refreshTokens(refreshToken);
    if (fresh?.accessToken) {
      const refreshedUser = extractAuthUser(fresh.accessToken);
      if (refreshedUser) {
        accessToken = fresh.accessToken;
        currentUser = refreshedUser;
        request.cookies.set(ACCESS_COOKIE, fresh.accessToken);
        request.cookies.set(REFRESH_COOKIE, fresh.refreshToken);
      } else {
        sessionExpired = true;
      }
    } else {
      sessionExpired = true; 
    }
  }

  // If session is expired or invalid, ensure any stale tokens are cleared
  if (sessionExpired || (!accessToken && !refreshToken)) {
    accessToken = undefined;
    currentUser = null;
  }

  const isLoggedIn = Boolean(accessToken && currentUser);
  let response: NextResponse;

  if (!isLoggedIn) {
    if (isPublicAuthPage) response = NextResponse.next();
    else if (isApi) response = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    else response = NextResponse.redirect(new URL("/login", request.url));
  } else if (isPublicAuthPage || pathname === "/") {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    // Route-level permission authorization check
    const userPerms = currentUser ? [...currentUser.roles, ...currentUser.permissions] : [];

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
        // If user doesn't have permission for this route, check if they can access dashboard
        if (pathname !== "/dashboard" && hasPermission(userPerms, "dashboard.read")) {
          response = NextResponse.redirect(new URL("/dashboard", request.url));
          response.cookies.set(AUTH_UPDATED_COOKIE, "1", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60,
          });
        } else {
          // If the user does not even have dashboard permission or has zero permissions,
          // expire the session and send to login to break redirect loops
          sessionExpired = true;
          response = NextResponse.redirect(new URL("/login", request.url));
        }
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
