"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldPlus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createRoleAction } from "@/features/roles/action";
import { sanitizeTextInput } from "@/lib/validations";

export default function NewRolePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const handleReset = () => {
    setName("");
    setCode("");
    setDescription("");
  };

  useEffect(() => {
    handleReset();
  }, []);

  // Auto-generate code slug if not manually customized
  const handleNameChange = (val: string) => {
    setName(val);
    // If code is empty or tracks the previous generated name, auto-suggest code in uppercase
    const autoCode = val
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "_");
    if (!code || code === name.toUpperCase().trim().replace(/[^A-Z0-9]+/g, "_")) {
      setCode(autoCode);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(name, 100);
    if (!cleanName) {
      toastError("Role name is required.");
      return;
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_");
    if (!cleanCode) {
      toastError("Role code is required.");
      return;
    }

    startTransition(async () => {
      const res = await createRoleAction({
        name: cleanName,
        code: cleanCode,
        description: description.trim() || null,
      });

      if (res.success) {
        success(res.message || "Role created successfully");
        router.push("/roles");
      } else {
        toastError(res.error || "Failed to create role");
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title="Manage Roles"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles", href: "/roles" },
          { label: "Add New Role" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-blue-600" />
              Add New Role
            </CardTitle>
            <p className="text-xs text-slate-500">
              Create a new user role with specific permissions and scopes.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
              Back to Roles List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              {/* Role Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Role Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Project Manager 2"
                  className="h-9 text-sm"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Role Code */}
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold text-slate-700">
                  Role Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]+/g, "_"))}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  className="h-9 text-sm font-mono uppercase"
                  disabled={isPending}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Unique uppercase identifier for system and permission assignment.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Manages project operations"
                  rows={3}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-24"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Role
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                asChild
                disabled={isPending}
              >
                <Link href="/roles">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

