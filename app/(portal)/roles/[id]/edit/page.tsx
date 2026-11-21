"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, use } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { updateRoleAction } from "@/features/roles/action";
import type { RoleItem } from "@/features/roles/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { sanitizeTextInput } from "@/lib/validations";

function EditRoleForm({ roleId, role }: { roleId: string; role: RoleItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { syncAuthFromCookies } = useAuth();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(
    null
  );
  const [isActiveOverride, setIsActiveOverride] = useState<boolean | null>(
    null
  );

  const name = nameOverride ?? (role.name || "");
  const description = descriptionOverride ?? (role.description || "");
  const isActive = isActiveOverride ?? role.isActive ?? true;

  const code = role.code || "";
  const isSystemRole = Boolean(role.isSystemRole);

  const handleReset = () => {
    setNameOverride(null);
    setDescriptionOverride(null);
    setIsActiveOverride(null);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
        syncAuthFromCookies();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.rolesPicklist }),
        ]);
        success(res.message || "Role updated successfully");
        router.push("/roles");
      } else {
        toastError(res.error || "Failed to update role");
      }
    });
  };

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

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Edit Role
            </CardTitle>
            {isSystemRole && (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                System Role
              </span>
            )}
          </div>
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
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Role Name */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-role-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-role-name"
                  value={name}
                  onChange={(e) => {
                    setNameOverride(e.target.value);
                  }}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  maxLength={100}
                  className="h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Role Code (Read-only) */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-role-code"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Role Code
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-role-code"
                  value={code}
                  readOnly
                  disabled
                  placeholder="Role Code"
                  className="h-9 cursor-not-allowed bg-slate-100 font-mono text-xs text-slate-500 uppercase"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-role-description"
                className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
              >
                Description
              </Label>
              <div className="sm:col-span-3">
                <textarea
                  id="edit-role-description"
                  value={description}
                  onChange={(e) => {
                    setDescriptionOverride(e.target.value);
                  }}
                  placeholder="Optional role description"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Status Checkbox */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="edit-role-active"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Status
              </Label>
              <div className="flex items-center gap-2 sm:col-span-3">
                <Checkbox
                  id="edit-role-active"
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    setIsActiveOverride(Boolean(checked));
                  }}
                  disabled={isPending}
                />
                <Label
                  htmlFor="edit-role-active"
                  className="cursor-pointer text-xs font-medium text-slate-700 select-none"
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
                onClick={() => {
                  handleReset();
                  router.back();
                }}
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

export default function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roleId } = use(params);
  const { can } = useAuth();
  const canUpdate = can("roles.update") || can("system.all");

  const {
    data: role,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.roles.detail(roleId),
    queryFn: ({ signal }) =>
      portalGet<RoleItem>(
        `roles/${encodeURIComponent(roleId)}`,
        undefined,
        signal
      ),
    enabled: Boolean(roleId) && canUpdate,
  });

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

  if (!role) {
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
        <Card className="space-y-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {isError && error instanceof Error
              ? error.message
              : "Failed to load role details."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/roles">Back to Roles List</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <EditRoleForm key={role.id} roleId={roleId} role={role} />;
}
