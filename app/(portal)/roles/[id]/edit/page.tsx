"use client";

import { useEffect, useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
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
      toastError("Role name is required.");
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

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Role"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Roles", href: "/roles" },
          { label: name || "Edit Role" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Edit Role: {name}
            </CardTitle>
            {code && (
              <p className="text-xs text-slate-500 font-mono">
                Code: <span className="font-semibold text-slate-700">{code}</span>
                {isSystemRole && (
                  <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    System Role
                  </span>
                )}
              </p>
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PROJECT_MANAGER_2"
                  className="h-9 text-sm"
                  disabled={isPending}
                  required
                />
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
                  placeholder="Optional role description"
                  rows={3}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Status Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                  disabled={isPending}
                />
                <Label
                  htmlFor="isActive"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Active Role
                </Label>
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
                Save Changes
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

