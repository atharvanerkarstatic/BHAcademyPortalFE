"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { createCategoryAction } from "@/features/categories/action";
import type { CreateCategoryPayload } from "@/features/categories/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber } from "@/lib/validations";

const TRANSLATION_LANGUAGES = [
  { code: "Hi", name: "Hindi (हिन्दी)" },
  { code: "Bn", name: "Bengali (বাংলা)" },
  { code: "Kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "Ml", name: "Malayalam (മലയാളം)" },
  { code: "Or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "Ta", name: "Tamil (தமிழ்)" },
  { code: "Te", name: "Telugu (తెలుగు)" },
  { code: "As", name: "Assamese (অসমীয়া)" },
  { code: "Gu", name: "Gujarati (ગુજરાતી)" },
  { code: "Mr", name: "Marathi (मराठी)" },
] as const;

const INITIAL_TRANSLATIONS: Record<string, string> = {
  categoryAs: "",
  categoryBn: "",
  categoryGu: "",
  categoryHi: "",
  categoryKn: "",
  categoryMl: "",
  categoryMr: "",
  categoryOr: "",
  categoryTa: "",
  categoryTe: "",
};

export default function NewCategoryPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formKey, setFormKey] = useState<number>(() => Date.now());

  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [featured, setFeatured] = useState<boolean>(false);

  const [translations, setTranslations] = useState<Record<string, string>>(INITIAL_TRANSLATIONS);

  const resetForm = () => {
    setCategory("");
    setImageUrl("");
    setDisplayOrder(1);
    setStatus("ACTIVE");
    setFeatured(false);
    setTranslations({ ...INITIAL_TRANSLATIONS });
    setFormKey(Date.now());
  };

  useEffect(() => {
    resetForm();
    return () => {
      resetForm();
    };
  }, []);

  const handleCancel = () => {
    resetForm();
    router.push("/categories");
  };

  const handleTranslationChange = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCategory = sanitizeTextInput(category, 255);
    if (!cleanCategory) {
      toastError("Category name is required.");
      return;
    }

    const cleanImageUrl = sanitizeTextInput(imageUrl, 500);

    const sanitizedTranslations: Record<string, string> = {};
    for (const [key, val] of Object.entries(translations)) {
      if (!val) continue;
      sanitizedTranslations[key] = sanitizeTextInput(val, 255);
    }

    const payload: CreateCategoryPayload = {
      category: cleanCategory,
      imageUrl: cleanImageUrl || undefined,
      displayOrder: sanitizeNonNegativeNumber(displayOrder, 0, 0),
      status,
      featured,
      ...sanitizedTranslations,
    };

    startTransition(async () => {
      const res = await createCategoryAction(payload);
      if (res.success) {
        success("Category created successfully");
        resetForm();
        router.push("/categories");
      } else {
        toastError(res.error || "Failed to create category. Please check all fields.");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Categories"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Categories List", href: "/categories" },
          { label: "Add New Category" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Category
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/categories">
              <ArrowLeft className="h-4 w-4" />
              Back to Categories List
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
            {/* Category Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="cat-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Category Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="cat-name"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Interior Textures"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="cat-image"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Image URL
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="cat-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="e.g. https://domain.com/category-image.png"
                  maxLength={500}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Display Order */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="cat-order"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Display Order <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="cat-order"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="cat-status"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Status <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="cat-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="cat-featured"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Featured
              </Label>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Checkbox
                  id="cat-featured"
                  checked={featured}
                  onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                />
                <Label
                  htmlFor="cat-featured"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Display as Featured Category
                </Label>
              </div>
            </div>

            {/* Multilingual Section Divider */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Multilingual Translations (Optional)
                </h3>
              </div>
              <div className="space-y-3">
                {TRANSLATION_LANGUAGES.map((lang) => {
                  const key = `category${lang.code}`;
                  return (
                    <div key={lang.code} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor={key}
                        className="text-xs font-medium text-slate-600 sm:text-right"
                      >
                        {lang.name}
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          id={key}
                          placeholder={`Category in ${lang.name}`}
                          value={translations[key] || ""}
                          onChange={(e) => handleTranslationChange(key, e.target.value)}
                          maxLength={255}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
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
                onClick={handleCancel}
                disabled={isPending}
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
