import { Suspense } from "react";

import { ClientIp } from "@/features/login/components/client-ip";
import LoginForm from "@/features/login/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
      <LoginForm
        ip={
          <Suspense fallback="detecting…">
            <ClientIp />
          </Suspense>
        }
      />
    </main>
  );
}
