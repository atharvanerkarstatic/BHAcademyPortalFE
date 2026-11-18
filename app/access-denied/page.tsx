"use client";

import Link from "next/link";
import { ShieldAlert, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/features/auth/action";

export default function AccessDeniedPage() {
  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border border-slate-200 bg-white rounded-xl overflow-hidden text-center">
        <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 flex flex-col items-center justify-center text-white">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <ShieldAlert className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Access Denied</h1>
        </div>

        <CardContent className="p-6 space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            You don&apos;t have access to this application. Please contact your Admin Team.
          </p>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 text-left flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              If you believe this is an error, please reach out to your administrator to assign the necessary roles and permissions to your account.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto text-xs font-semibold uppercase border-slate-300 gap-1.5"
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
