"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { getLanguageByIdAction, updateLanguageAction } from "@/features/languages/action";
import type { UpdateLanguagePayload } from "@/features/languages/types";

export default function EditLanguagePage() {
  const params = useParams();
  const router = useRouter();
  const languageId = params.id as string;

  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      if (!languageId) return;
      setIsLoading(true);
      const res = await getLanguageByIdAction(languageId);
      setIsLoading(false);
      if (res.success && res.data) {
        setLanguage(res.data.language || "");
        setLanguageCode(res.data.languageCode || "");
        setNativeName(res.data.nativeName || "");
        setIsDefault(res.data.isDefault ?? false);
        setIsActive(res.data.isActive ?? true);
      } else {
        const msg = res.error || "Failed to load language details.";
        setError(msg);
        toastError(msg);
      }
    }
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!language.trim()) {
      setError("Language name is required.");
      return;
    }

    const payload: UpdateLanguagePayload = {
      language: language.trim(),
      languageCode: languageCode.trim() || null,
      nativeName: nativeName.trim() || null,
      isDefault,
      isActive,
    };

    startTransition(async () => {
      const res = await updateLanguageAction(languageId, payload);
      if (res.success) {
        success("Language updated successfully");
        router.push("/languages");
      } else {
        const msg = res.error || "Failed to update language. Please try again.";
        setError(msg);
        toastError(msg);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/languages">
            <ArrowLeft className="h-4 w-4" />
            Back to Languages
          </Link>
        </Button>
      </div>

      <PageHeader
        title={language ? `Edit Language: ${language}` : "Edit Language"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Languages", href: "/languages" },
          { label: "Edit Language" },
        ]}
      />

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Language Details</CardTitle>
                <CardDescription>
                  Update language information
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="language">
                  Language Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, Hindi, Bengali"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="languageCode">Language Code</Label>
                <Input
                  id="languageCode"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  placeholder="e.g. en, hi, bn"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nativeName">Native Name</Label>
                <Input
                  id="nativeName"
                  value={nativeName}
                  onChange={(e) => setNativeName(e.target.value)}
                  placeholder="e.g. English, हिन्दी, বাংলা"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
                />
                <Label htmlFor="isDefault" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Set as Default Language
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild disabled={isPending}>
            <Link href="/languages">Cancel</Link>
          </Button>

          <Button type="submit" disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-700">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
