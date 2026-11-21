import { NextResponse } from "next/server";
import { ALL_AUTH_COOKIES } from "@/lib/auth-cookies";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  for (const name of ALL_AUTH_COOKIES) {res.cookies.delete(name);}
  return res;
}