"use client";

import { ShieldAlert, LogOut, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/features/auth/action";

const handleLogout = () => {
  void logoutAction();
};

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-lg">
        <div className="flex flex-col items-center justify-center bg-gradient-to-r from-rose-500 to-red-600 p-6 text-white">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <ShieldAlert className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Access Denied</h1>
        </div>

        <CardContent className="space-y-5 p-6">
          <p className="text-sm leading-relaxed font-medium text-slate-700">
            You don&apos;t have access to this application. Please contact your
            Admin Team.
          </p>

          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-left text-xs text-amber-800">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              If you believe this is an error, please reach out to your
              administrator to assign the necessary roles and permissions to
              your account.
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full gap-1.5 border-slate-300 text-xs font-semibold uppercase sm:w-auto"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
