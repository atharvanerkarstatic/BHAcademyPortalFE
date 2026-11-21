import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { UserName } from "@/components/layout/user-name";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentUser } from "@/lib/auth-server";
import { QueryProvider } from "@/lib/query-provider";
import { getFirstAccessibleRoute } from "@/lib/route-permissions";

// Dynamic session-dependent portal layout
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userPerms = [...user.roles, ...user.permissions];
  const firstRoute = getFirstAccessibleRoute(userPerms);

  if (!firstRoute) {
    redirect("/access-denied");
  }

  return (
    <QueryProvider>
      <AuthProvider initialUser={user}>
        <PortalShell
          user={
            <Suspense fallback="…">
              <UserName fallback={user?.email} />
            </Suspense>
          }
        >
          <Suspense fallback={null}>{children}</Suspense>
        </PortalShell>
      </AuthProvider>
    </QueryProvider>
  );
}
