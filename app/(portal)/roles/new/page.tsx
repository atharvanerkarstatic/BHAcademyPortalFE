"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { createRoleAction } from "@/features/roles/action";
import { sanitizeTextInput } from "@/lib/validations";

export default function NewRolePage() {
  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formKey, setFormKey] = useState(0);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = can("roles.create") || can("system.all");

  const handleReset = () => {
    setName("");
    setCode("");
    setDescription("");
    setFormKey((k) => k + 1);
  };

  useEffect(() => {
    handleReset();
    return () => {
      setName("");
      setCode("");
      setDescription("");
    };
  }, []);

  // Auto-generate code slug if not manually customized
  const handleNameChange = (val: string) => {
    setName(val);
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
      toastError("Role Name is required.");
      return;
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_");
    if (!cleanCode) {
      toastError("Role Code is required.");
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
        handleReset();
        router.push("/roles");
      } else {
        toastError(res.error || "Failed to create role");
      }
    });
  };

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Add New Role"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Roles", href: "/roles" },
            { label: "Add" },
          ]}
        />
        <Card className="p-8 text-center text-slate-500">
          You do not have permission to create roles.
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
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
          <CardTitle className="text-base font-bold text-slate-900">Add New Role</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
              Back to Roles List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form key={formKey} onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Role Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="role-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Role Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Project Manager 2"
                  maxLength={100}
                  className="h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Role Code */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="role-code" className="text-xs font-semibold text-slate-700 sm:text-right">
                Role Code <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="role-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]+/g, "_"))}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  maxLength={100}
                  className="h-9 text-xs font-mono uppercase"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label htmlFor="role-description" className="text-xs font-semibold text-slate-700 sm:text-right pt-2">
                Description
              </Label>
              <div className="sm:col-span-3">
                <textarea
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Manages project operations"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleReset}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

