import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/layout/portal-shell";
import { UserName } from "@/components/layout/user-name";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentUser } from "@/lib/auth-server";

// Dynamic session-dependent portal layout
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
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
  );
}