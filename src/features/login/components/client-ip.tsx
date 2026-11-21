import { headers } from "next/headers";

export async function ClientIp() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "Unknown";
  return ip;
}
