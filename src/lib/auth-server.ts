import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { extractAuthUser } from '@/lib/auth-jwt';
import type { AuthUser } from '@/lib/auth-jwt';

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) {return null;}
  return extractAuthUser(token);
}
