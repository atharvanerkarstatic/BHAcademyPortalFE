"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldCheck, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition, useMemo } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateRolePermissionsAction } from "@/features/roles/action";
import type {
  RolePermissionsData,
  PermissionItem,
  UpdateRolePermissionsPayload,
} from "@/features/roles/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

interface PermissionMaps {
  states: Record<number, boolean>;
  scopes: Record<number, string>;
}

function buildPermissionMaps(data: RolePermissionsData): PermissionMaps {
  const states: Record<number, boolean> = {};
  const scopes: Record<number, string> = {};

  for (const list of Object.values(data.permissions || {})) {
    for (const p of list) {
      states[p.permissionId] = p.assigned;
      // Default scope to assignedScope, or first availableScope, or "ALL"
      scopes[p.permissionId] =
        p.assignedScope ||
        (p.availableScopes && p.availableScopes.length > 0
          ? p.availableScopes[0]
          : "ALL");
    }
  }

  return { states, scopes };
}

function RolePermissionsForm({
  roleId,
  roleData,
}: {
  roleId: string;
  roleData: RolePermissionsData;
}) {
  const queryClient = useQueryClient();
  const { syncAuthFromCookies } = useAuth();
  const { success, error: toastError } = useToast();

  const baseMaps = useMemo(() => buildPermissionMaps(roleData), [roleData]);
  const [permissionStateOverrides, setPermissionStateOverrides] = useState<
    Record<number, boolean>
  >({});
  const [permissionScopeOverrides, setPermissionScopeOverrides] = useState<
    Record<number, string>
  >({});

  const permissionStates = useMemo(
    () => ({ ...baseMaps.states, ...permissionStateOverrides }),
    [baseMaps.states, permissionStateOverrides]
  );
  const permissionScopes = useMemo(
    () => ({ ...baseMaps.scopes, ...permissionScopeOverrides }),
    [baseMaps.scopes, permissionScopeOverrides]
  );

  const [searchFilter, setSearchFilter] = useState("");
  const [isSaving, startSaving] = useTransition();

  const togglePermission = (permissionId: number) => {
    setPermissionStateOverrides((prev) => ({
      ...prev,
      [permissionId]: !(permissionId in prev
        ? prev[permissionId]
        : baseMaps.states[permissionId]),
    }));
  };

  const handleScopeChange = (permissionId: number, scope: string) => {
    setPermissionScopeOverrides((prev) => ({
      ...prev,
      [permissionId]: scope,
    }));
  };

  const toggleCategory = (
    categoryPermissions: Array<PermissionItem>,
    assignAll: boolean
  ) => {
    setPermissionStateOverrides((prev) => {
      const next = { ...prev };
      for (const p of categoryPermissions) {
        next[p.permissionId] = assignAll;
      }
      return next;
    });
  };

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!roleData.permissions) {
      return {};
    }
    const filter = searchFilter.trim().toLowerCase();
    if (!filter) {
      return roleData.permissions;
    }

    const result: Record<string, Array<PermissionItem>> = {};
    for (const [moduleName, perms] of Object.entries(roleData.permissions)) {
      const matching = perms.filter(
        (p) =>
          p.displayName.toLowerCase().includes(filter) ||
          p.permissionKey.toLowerCase().includes(filter) ||
          p.description.toLowerCase().includes(filter) ||
          moduleName.toLowerCase().includes(filter)
      );
      if (matching.length > 0) {
        result[moduleName] = matching;
      }
    }
    return result;
  }, [roleData, searchFilter]);

  const totalAssigned = useMemo(
    () => Object.values(permissionStates).filter(Boolean).length,
    [permissionStates]
  );

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    startSaving(async () => {
      // Build selected permissions array for PUT /api/v1/permissions/roles/:roleId
      const selectedPayload: UpdateRolePermissionsPayload["permissions"] = [];

      for (const [permIdStr, isAssigned] of Object.entries(permissionStates)) {
        if (isAssigned) {
          const permId = Number(permIdStr);
          const chosenScope = permissionScopes[permId] || "ALL";
          selectedPayload.push({
            permissionId: permId,
            scope: chosenScope,
          });
        }
      }

      const res = await updateRolePermissionsAction(roleId, {
        permissions: selectedPayload,
      });

      if (res.success) {
        syncAuthFromCookies();
        if (res.data) {
          queryClient.setQueryData(
            queryKeys.roles.permissions(roleId),
            res.data
          );
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.rolesPicklist }),
        ]);
        setPermissionStateOverrides({});
        setPermissionScopeOverrides({});
        success(res.message || "Role permissions updated successfully");
      } else {
        toastError(res.error || "Failed to update role permissions");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Role Permissions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles", href: "/roles" },
          { label: roleData.roleName || "Role Permissions" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Role Permissions: {roleData.roleName}
            </CardTitle>
            <p className="font-mono text-xs text-slate-500">
              Code:{" "}
              <span className="font-semibold text-slate-700">
                {roleData.roleCode}
              </span>{" "}
              • Assigned:{" "}
              <span className="font-semibold text-blue-600">
                {totalAssigned}
              </span>{" "}
              permissions
            </p>
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
          <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-6">
            {/* Search and Quick Filters */}
            <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Filter permissions..."
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                  }}
                  className="h-8 bg-white pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next: Record<number, boolean> = {};
                    for (const list of Object.values(
                      roleData.permissions || {}
                    )) {
                      for (const p of list) {
                        next[p.permissionId] = true;
                      }
                    }
                    setPermissionStateOverrides(next);
                  }}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next: Record<number, boolean> = {};
                    for (const list of Object.values(
                      roleData.permissions || {}
                    )) {
                      for (const p of list) {
                        next[p.permissionId] = false;
                      }
                    }
                    setPermissionStateOverrides(next);
                  }}
                  className="h-8 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Modules and Permissions listing */}
            <div className="space-y-4">
              {Object.keys(filteredModules).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No permissions matching &quot;{searchFilter}&quot;
                </div>
              ) : (
                Object.entries(filteredModules).map(([moduleName, perms]) => {
                  const allCategoryAssigned = perms.every(
                    (p) => permissionStates[p.permissionId]
                  );

                  return (
                    <div
                      key={moduleName}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
                    >
                      {/* Module Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                            {moduleName.replaceAll("_", " ")}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            (
                            {
                              perms.filter(
                                (p) => permissionStates[p.permissionId]
                              ).length
                            }
                            /{perms.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            toggleCategory(perms, !allCategoryAssigned);
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {allCategoryAssigned
                            ? "Deselect Group"
                            : "Select Group"}
                        </button>
                      </div>

                      {/* Permission Rows */}
                      <div className="divide-y divide-slate-100">
                        {perms.map((p) => {
                          const isAssigned = permissionStates[p.permissionId];
                          const inputId = `perm-${p.permissionId}`;
                          const scopeId = `perm-scope-${p.permissionId}`;
                          return (
                            <div
                              key={p.permissionId}
                              className={`flex items-start gap-3.5 px-4 py-3 transition-colors hover:bg-slate-50/80 ${
                                isAssigned ? "bg-blue-50/25" : ""
                              }`}
                            >
                              {/* Left Checkbox */}
                              <div className="flex shrink-0 items-center pt-0.5">
                                <Checkbox
                                  id={inputId}
                                  checked={isAssigned}
                                  onCheckedChange={() => {
                                    togglePermission(p.permissionId);
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                                />
                              </div>

                              {/* Permission Details */}
                              <label
                                htmlFor={inputId}
                                className="min-w-0 flex-1 cursor-pointer space-y-0.5"
                              >
                                <span className="block text-xs font-semibold text-slate-900">
                                  {p.displayName}
                                </span>
                                <span className="block text-[11px] leading-snug text-slate-500">
                                  {p.description}
                                </span>
                              </label>

                              {/* Scope Selector (always visible if availableScopes > 1) */}
                              {p.availableScopes &&
                                p.availableScopes.length > 1 && (
                                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                                    <label
                                      htmlFor={scopeId}
                                      className="text-[10px] font-semibold text-slate-400 uppercase"
                                    >
                                      Scope:
                                    </label>
                                    <select
                                      id={scopeId}
                                      value={
                                        permissionScopes[p.permissionId] ||
                                        p.availableScopes[0]
                                      }
                                      onChange={(e) => {
                                        handleScopeChange(
                                          p.permissionId,
                                          e.target.value
                                        );
                                      }}
                                      className="h-7 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    >
                                      {p.availableScopes.map((sc) => (
                                        <option key={sc} value={sc}>
                                          {sc}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Buttons matching Add Account Form */}
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-8 min-w-24 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-8 min-w-24 border-slate-300 text-xs font-medium uppercase"
              >
                <Link href="/roles">CANCEL</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RolePermissionsPage() {
  const params = useParams();
  const roleId = String(params.id ?? "");

  const {
    data: roleData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: ({ signal }) =>
      portalGet<RolePermissionsData>(
        `roles/${encodeURIComponent(roleId)}/permissions`,
        undefined,
        signal
      ),
    enabled: Boolean(roleId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!roleData) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Manage Role Permissions"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Roles", href: "/roles" },
            { label: "Role Permissions" },
          ]}
        />
        <Card className="space-y-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {isError && error instanceof Error
              ? error.message
              : "Failed to load role permissions."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/roles">Back to Roles List</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <RolePermissionsForm
      key={roleData.roleId}
      roleId={roleId}
      roleData={roleData}
    />
  );
}
