import { cookies } from "next/headers";

import { USER_COOKIE } from "@/lib/auth-cookies";

export async function UserName({ fallback }: { fallback?: string }) {
  const cookieStore = await cookies();
  const email = cookieStore.get(USER_COOKIE)?.value ?? fallback;
  return email ?? "User";
}
