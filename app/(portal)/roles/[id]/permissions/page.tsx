"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Check, Search } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getRolePermissionsAction, updateRolePermissionsAction } from "@/features/roles/action";
import type { RolePermissionsData, PermissionItem, UpdateRolePermissionsPayload } from "@/features/roles/types";

export default function RolePermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [roleData, setRoleData] = useState<RolePermissionsData | null>(null);
  const [permissionStates, setPermissionStates] = useState<Record<number, boolean>>({});
  const [permissionScopes, setPermissionScopes] = useState<Record<number, string>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const res = await getRolePermissionsAction(roleId);
      if (!mounted) return;

      if (res.success && res.data) {
        setRoleData(res.data);
        const initialMap: Record<number, boolean> = {};
        const initialScopeMap: Record<number, string> = {};
        Object.values(res.data.permissions || {}).forEach((list) => {
          list.forEach((p) => {
            initialMap[p.permissionId] = Boolean(p.assigned);
            // Default scope to assignedScope, or first availableScope, or "ALL"
            const defScope =
              p.assignedScope ||
              (p.availableScopes && p.availableScopes.length > 0 ? p.availableScopes[0] : "ALL");
            initialScopeMap[p.permissionId] = defScope;
          });
        });
        setPermissionStates(initialMap);
        setPermissionScopes(initialScopeMap);
      } else {
        toastError(res.error || "Failed to load role permissions");
      }
      setLoading(false);
    }

    if (roleId) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [roleId]);

  const togglePermission = (permissionId: number) => {
    setPermissionStates((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
  };

  const handleScopeChange = (permissionId: number, scope: string) => {
    setPermissionScopes((prev) => ({
      ...prev,
      [permissionId]: scope,
    }));
  };

  const toggleCategory = (categoryPermissions: PermissionItem[], assignAll: boolean) => {
    setPermissionStates((prev) => {
      const next = { ...prev };
      categoryPermissions.forEach((p) => {
        next[p.permissionId] = assignAll;
      });
      return next;
    });
  };

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!roleData?.permissions) return {};
    const filter = searchFilter.trim().toLowerCase();
    if (!filter) return roleData.permissions;

    const result: Record<string, PermissionItem[]> = {};
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

  const totalAssigned = useMemo(() => {
    return Object.values(permissionStates).filter(Boolean).length;
  }, [permissionStates]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      // Build selected permissions array for PUT /api/v1/permissions/roles/:roleId
      const selectedPayload: UpdateRolePermissionsPayload["permissions"] = [];

      Object.entries(permissionStates).forEach(([permIdStr, isAssigned]) => {
        if (isAssigned) {
          const permId = Number(permIdStr);
          const chosenScope = permissionScopes[permId] || "ALL";
          selectedPayload.push({
            permissionId: permId,
            scope: chosenScope,
          });
        }
      });

      const res = await updateRolePermissionsAction(roleId, {
        permissions: selectedPayload,
      });

      if (res.success && res.data) {
        success(res.message || "Role permissions updated successfully");
        setRoleData(res.data);
        const updatedMap: Record<number, boolean> = {};
        const updatedScopeMap: Record<number, string> = {};
        Object.values(res.data.permissions || {}).forEach((list) => {
          list.forEach((p) => {
            updatedMap[p.permissionId] = Boolean(p.assigned);
            const defScope =
              p.assignedScope ||
              (p.availableScopes && p.availableScopes.length > 0 ? p.availableScopes[0] : "ALL");
            updatedScopeMap[p.permissionId] = defScope;
          });
        });
        setPermissionStates(updatedMap);
        setPermissionScopes(updatedScopeMap);
      } else {
        toastError(res.error || "Failed to update role permissions");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Role Permissions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles", href: "/roles" },
          { label: roleData?.roleName || "Role Permissions" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Role Permissions: {roleData?.roleName}
            </CardTitle>
            <p className="text-xs text-slate-500 font-mono">
              Code: <span className="font-semibold text-slate-700">{roleData?.roleCode}</span> • Assigned:{" "}
              <span className="font-semibold text-blue-600">{totalAssigned}</span> permissions
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
          <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
            {/* Search and Quick Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter permissions..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next: Record<number, boolean> = {};
                    Object.values(roleData?.permissions || {}).forEach((list) => {
                      list.forEach((p) => {
                        next[p.permissionId] = true;
                      });
                    });
                    setPermissionStates(next);
                  }}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissionStates({})}
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
                  const someCategoryAssigned = perms.some(
                    (p) => permissionStates[p.permissionId]
                  );

                  return (
                    <div
                      key={moduleName}
                      className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs"
                    >
                      {/* Module Header */}
                      <div className="flex items-center justify-between bg-slate-100/70 px-4 py-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                            {moduleName.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({perms.filter((p) => permissionStates[p.permissionId]).length}/{perms.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategory(perms, !allCategoryAssigned)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {allCategoryAssigned ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>

                      {/* Permission Rows */}
                      <div className="divide-y divide-slate-100">
                        {perms.map((p) => {
                          const isAssigned = Boolean(permissionStates[p.permissionId]);
                          const inputId = `perm-${p.permissionId}`;
                          return (
                            <div
                              key={p.permissionId}
                              onClick={() => togglePermission(p.permissionId)}
                              className={`flex items-start gap-3.5 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                                isAssigned ? "bg-blue-50/25" : ""
                              }`}
                            >
                              {/* Left Checkbox */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center pt-0.5 shrink-0"
                              >
                                <Checkbox
                                  id={inputId}
                                  checked={isAssigned}
                                  onCheckedChange={() => togglePermission(p.permissionId)}
                                  className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                              </div>

                              {/* Permission Details */}
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <label
                                    htmlFor={inputId}
                                    className="text-xs font-semibold text-slate-900 cursor-pointer"
                                  >
                                    {p.displayName}
                                  </label>
                                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    {p.permissionKey}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                  {p.description}
                                </p>
                              </div>

                              {/* Scope Selector (always visible if availableScopes > 1) */}
                              {p.availableScopes && p.availableScopes.length > 1 && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 shrink-0 pt-0.5"
                                >
                                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                                    Scope:
                                  </span>
                                  <select
                                    value={permissionScopes[p.permissionId] || p.availableScopes[0]}
                                    onChange={(e) =>
                                      handleScopeChange(p.permissionId, e.target.value)
                                    }
                                    className="h-7 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
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

