"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { updateLanguageAction } from "@/features/languages/action";
import type {
  LanguageItem,
  UpdateLanguagePayload,
} from "@/features/languages/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { sanitizeTextInput } from "@/lib/validations";

function EditLanguageForm({
  languageId,
  item,
}: {
  languageId: string;
  item: LanguageItem;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [language, setLanguage] = useState(() => item.language || "");
  const [languageCode, setLanguageCode] = useState(
    () => item.languageCode || ""
  );
  const [isDefault, setIsDefault] = useState(() => item.isDefault ?? false);
  const [isActive, setIsActive] = useState(() => item.isActive ?? true);

  const handleReset = () => {
    setLanguage(item.language || "");
    setLanguageCode(item.languageCode || "");
    setIsDefault(item.isDefault ?? false);
    setIsActive(item.isActive ?? true);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(language, 100);
    if (!cleanName) {
      toastError("Language name is required.");
      return;
    }

    const payload: UpdateLanguagePayload = {
      language: cleanName,
      languageCode: languageCode.trim() || null,
      isDefault,
      isActive,
    };

    startTransition(async () => {
      const res = await updateLanguageAction(languageId, payload);
      if (res.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.languages.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.allLanguages }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reportFilters }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        ]);
        success("Language updated successfully");
        router.push("/languages");
      } else {
        toastError(res.error || "Failed to update language. Please try again.");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Languages"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Languages", href: "/languages" },
          { label: "Edit Language" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Language{language ? `: ${language}` : ""}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <Link href="/languages">
              <ArrowLeft className="h-4 w-4" />
              Back to Languages List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Language Name */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="lang-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Language Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="lang-name"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                  placeholder="e.g. English, Hindi, Bengali"
                  maxLength={100}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Language Code */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="lang-code"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Language Code
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="lang-code"
                  value={languageCode}
                  onChange={(e) => {
                    setLanguageCode(e.target.value.toLowerCase());
                  }}
                  placeholder="e.g. en, hi, bn"
                  maxLength={10}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 items-start gap-4 pt-1 sm:grid-cols-4">
              <div className="sm:text-right">
                <span className="text-xs font-semibold text-slate-700">
                  Options
                </span>
              </div>
              <div className="space-y-3 sm:col-span-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(checked) => {
                      setIsDefault(Boolean(checked));
                    }}
                  />
                  <Label
                    htmlFor="isDefault"
                    className="cursor-pointer text-xs font-medium text-slate-700"
                  >
                    Set as Default Language
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      setIsActive(Boolean(checked));
                    }}
                  />
                  <Label
                    htmlFor="isActive"
                    className="cursor-pointer text-xs font-medium text-slate-700"
                  >
                    Active
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons matching Edit Account */}
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
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

export default function EditLanguagePage() {
  const params = useParams();
  const languageId = String(params.id ?? "");

  const {
    data: languageItem,
    isLoading,
    isFetching,
    isPaused,
    isFetchedAfterMount,
    error,
  } = useQuery({
    queryKey: queryKeys.languages.detail(languageId),
    queryFn: ({ signal }) =>
      portalGet<LanguageItem>(
        `languages/${encodeURIComponent(languageId)}`,
        undefined,
        signal
      ),
    enabled: Boolean(languageId),
    refetchOnMount: "always",
    refetchOnReconnect: false,
  });

  if (isLoading || ((isFetching || isPaused) && !isFetchedAfterMount)) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!languageItem) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/languages">
            <ArrowLeft className="h-4 w-4" />
            Back to Languages List
          </Link>
        </Button>
        <Card className="p-8 text-center text-sm text-slate-500">
          {error instanceof Error
            ? error.message
            : "Failed to load language details."}
        </Card>
      </div>
    );
  }

  return (
    <EditLanguageForm
      key={languageItem.languageId ?? languageId}
      languageId={languageId}
      item={languageItem}
    />
  );
}
