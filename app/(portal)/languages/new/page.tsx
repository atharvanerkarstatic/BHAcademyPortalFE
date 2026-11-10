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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { createLanguageAction } from "@/features/languages/action";
import type { CreateLanguagePayload } from "@/features/languages/types";
import { sanitizeTextInput } from "@/lib/validations";

export default function NewLanguagePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formKey, setFormKey] = useState<number>(0);
  const [language, setLanguage] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const handleReset = () => {
    setLanguage("");
    setLanguageCode("");
    setIsDefault(false);
    setIsActive(true);
    setFormKey((k) => k + 1);
  };

  useEffect(() => {
    handleReset();
    return () => {
      handleReset();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = sanitizeTextInput(language, 100);
    if (!cleanName) {
      toastError("Language name is required.");
      return;
    }

    const payload: CreateLanguagePayload = {
      language: cleanName,
      languageCode: languageCode.trim() || null,
      isDefault,
      isActive,
    };

    startTransition(async () => {
      const res = await createLanguageAction(payload);
      if (res.success) {
        success("Language created successfully");
        router.push("/languages");
      } else {
        toastError(res.error || "Failed to create language. Please try again.");
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
          { label: "Add New Language" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Add New Language</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/languages">
              <ArrowLeft className="h-4 w-4" />
              Back to Languages List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form key={formKey} onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Language Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="lang-name" className="text-xs font-semibold text-slate-700 sm:text-right">
                Language Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="lang-name"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, Hindi, Bengali"
                  maxLength={100}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Language Code */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="lang-code" className="text-xs font-semibold text-slate-700 sm:text-right">
                Language Code
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="lang-code"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value.toLowerCase())}
                  placeholder="e.g. en, hi, bn"
                  maxLength={10}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4 pt-1">
              <div className="sm:text-right">
                <span className="text-xs font-semibold text-slate-700">Options</span>
              </div>
              <div className="sm:col-span-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
                  />
                  <Label htmlFor="isDefault" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Set as Default Language
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                  />
                  <Label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons matching Add Account */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
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
