"use client";

import { useEffect, useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getRoleByIdAction, updateRoleAction } from "@/features/roles/action";
import { sanitizeTextInput } from "@/lib/validations";

export default function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const unwrappedParams = typeof (params as any)?.then === "function" ? use(params as Promise<{ id: string }>) : (params as { id: string });
  const roleId = unwrappedParams.id;
  const router = useRouter();
  const { can } = useAuth();

  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSystemRole, setIsSystemRole] = useState(false);

  // Original state for reset
  const [initialData, setInitialData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
  } | null>(null);

  const canUpdate = can("roles.update") || can("system.all");

  useEffect(() => {
    async function fetchDetail() {
      if (!roleId) return;
      setIsLoading(true);
      const res = await getRoleByIdAction(roleId);
      setIsLoading(false);
      if (res.success && res.data) {
        const nameVal = res.data.name || "";
        const codeVal = res.data.code || "";
        const descVal = res.data.description || "";
        const activeVal = res.data.isActive ?? true;
        const systemVal = Boolean(res.data.isSystemRole);

        setName(nameVal);
        setCode(codeVal);
        setDescription(descVal);
        setIsActive(activeVal);
        setIsSystemRole(systemVal);

        setInitialData({
          name: nameVal,
          description: descVal,
          isActive: activeVal,
        });
      } else {
        toastError(res.error || "Failed to load role details.");
      }
    }
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const handleReset = () => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setIsActive(initialData.isActive);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(name, 100);
    if (!cleanName) {
      toastError("Role Name is required.");
      return;
    }

    startTransition(async () => {
      const res = await updateRoleAction(roleId, {
        name: cleanName,
        description: description.trim() || null,
        isActive,
      });

      if (res.success) {
        success(res.message || "Role updated successfully");
        router.push("/roles");
      } else {
        toastError(res.error || "Failed to update role");
      }
    });
  };

  if (!canUpdate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit Role"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Roles", href: "/roles" },
            { label: "Edit" },
          ]}
        />
        <Card className="p-8 text-center text-slate-500">
          You do not have permission to edit roles.
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
          { label: name || "Edit Role" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-bold text-slate-900">Edit Role</CardTitle>
            {isSystemRole && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                System Role
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600">
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
              Back to Roles List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Role Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Role Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  maxLength={100}
                  className="h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Role Code (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role-code" className="text-xs font-semibold text-slate-700 sm:text-right">
                Role Code
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-role-code"
                  value={code}
                  readOnly
                  disabled
                  placeholder="Role Code"
                  className="h-9 text-xs font-mono uppercase bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-role-description" className="text-xs font-semibold text-slate-700 sm:text-right pt-2">
                Description
              </Label>
              <div className="sm:col-span-3">
                <textarea
                  id="edit-role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional role description"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Status Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role-active" className="text-xs font-semibold text-slate-700 sm:text-right">
                Status
              </Label>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Checkbox
                  id="edit-role-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                  disabled={isPending}
                />
                <Label
                  htmlFor="edit-role-active"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Role is Active
                </Label>
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

