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
import { extractAuthUser } from "@/lib/auth-jwt";
import {
  getFirstAccessibleRoute,
  isRouteAllowed,
} from "@/lib/route-permissions";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicAuthPage = pathname === "/login" || pathname === "/forgot-password";
  const isAccessDeniedPage = pathname === "/access-denied";

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
  } else {
    // Authenticated user permissions
    const userPerms = currentUser ? [...currentUser.roles, ...currentUser.permissions] : [];
    const firstAllowedRoute = getFirstAccessibleRoute(userPerms);

    if (isPublicAuthPage || pathname === "/") {
      if (firstAllowedRoute) {
        response = NextResponse.redirect(new URL(firstAllowedRoute, request.url));
      } else {
        response = NextResponse.redirect(new URL("/access-denied", request.url));
      }
    } else if (isAccessDeniedPage) {
      // If user has access to routes now, redirect them back to their allowed route
      if (firstAllowedRoute) {
        response = NextResponse.redirect(new URL(firstAllowedRoute, request.url));
      } else {
        response = NextResponse.next({ request });
      }
    } else {
      // Check if user has zero permissions across the app
      if (!firstAllowedRoute) {
        if (isApi) {
          response = NextResponse.json({ message: "Forbidden" }, { status: 403 });
        } else {
          response = NextResponse.redirect(new URL("/access-denied", request.url));
        }
      } else {
        // User has some allowed routes; check if the requested pathname is permitted
        const allowed = isRouteAllowed(pathname, userPerms);

        if (!allowed) {
          if (isApi) {
            response = NextResponse.json({ message: "Forbidden" }, { status: 403 });
          } else {
            response = NextResponse.redirect(new URL(firstAllowedRoute, request.url));
            response.cookies.set(AUTH_UPDATED_COOKIE, "1", {
              httpOnly: false,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60,
            });
          }
        } else {
          response = NextResponse.next({ request });
        }
      }
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
