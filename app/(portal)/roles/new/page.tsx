"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createRoleAction } from "@/features/roles/action";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { sanitizeTextInput } from "@/lib/validations";

export default function NewRolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can, syncAuthFromCookies } = useAuth();
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

  const handleBack = () => {
    handleReset();
    router.back();
  };

  // Auto-generate code slug if not manually customized
  const handleNameChange = (val: string) => {
    setName(val);
    const autoCode = val
      .toUpperCase()
      .trim()
      .replaceAll(/[^A-Z0-9]+/gu, "_");
    if (
      !code ||
      code ===
        name
          .toUpperCase()
          .trim()
          .replaceAll(/[^A-Z0-9]+/gu, "_")
    ) {
      setCode(autoCode);
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(name, 100);
    if (!cleanName) {
      toastError("Role Name is required.");
      return;
    }

    const cleanCode = code
      .trim()
      .toUpperCase()
      .replaceAll(/[^A-Z0-9_]+/gu, "_");
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
        syncAuthFromCookies();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.rolesPicklist }),
        ]);
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

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Role
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600"
          >
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
              Back to Roles List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            key={formKey}
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Role Name */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="role-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => {
                    handleNameChange(e.target.value);
                  }}
                  placeholder="e.g. Project Manager 2"
                  maxLength={100}
                  className="h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Role Code */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="role-code"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role Code <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="role-code"
                  value={code}
                  onChange={(e) => {
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replaceAll(/[^A-Z0-9_]+/gu, "_")
                    );
                  }}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  maxLength={100}
                  className="h-9 font-mono text-xs uppercase"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
              <Label
                htmlFor="role-description"
                className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
              >
                Description
              </Label>
              <div className="sm:col-span-3">
                <textarea
                  id="role-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  placeholder="e.g. Manages project operations"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 min-w-24 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleBack}
                className="h-8 min-w-24 border-slate-300 text-xs font-medium uppercase"
              >
                BACK
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
