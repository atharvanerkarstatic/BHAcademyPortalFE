import { extractAuthUser, type AuthUser } from "./auth-jwt";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const USER_COOKIE = "user_email";
export const AUTH_PERMS_COOKIE = "user_perms";
export const AUTH_UPDATED_COOKIE = "auth_updated";
export const ALL_AUTH_COOKIES = [
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  AUTH_PERMS_COOKIE,
  AUTH_UPDATED_COOKIE,
];

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; 
const EXPIRY_BUFFER = 30; // seconds

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  issuedAt: string;
};

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Client-readable cookie for instant synchronous UI authorization without hydration delays
const clientReadable = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function buildAuthCookies(tokens: TokenResponse) {
  const user = extractAuthUser(tokens.accessToken);
  const authPayload = user
    ? JSON.stringify({
        id: user.id,
        email: user.email,
        auth: [...user.roles, ...user.permissions],
      })
    : "{}";

  const maxAge = Math.max(tokens.expiresInSeconds - EXPIRY_BUFFER, 1);

  return [
    {
      name: ACCESS_COOKIE,
      value: tokens.accessToken,
      options: { ...base, maxAge },
    },
    {
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      options: { ...base, maxAge: REFRESH_MAX_AGE },
    },
    {
      name: AUTH_PERMS_COOKIE,
      value: encodeURIComponent(authPayload),
      options: { ...clientReadable, maxAge },
    },
    ...(user?.email
      ? [
          {
            name: USER_COOKIE,
            value: user.email,
            options: { ...base, maxAge: REFRESH_MAX_AGE },
          },
        ]
      : []),
  ];
}

export function userCookie(email: string) {
  return { name: USER_COOKIE, value: email, options: { ...base, maxAge: REFRESH_MAX_AGE } };
}