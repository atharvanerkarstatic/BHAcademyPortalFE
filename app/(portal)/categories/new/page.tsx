"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, Layers, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { createCategoryAction } from "@/features/categories/action";
import type { CreateCategoryPayload } from "@/features/categories/types";

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

  // Form key to force-clear any cached DOM input fields upon remount or reset
  const [formKey, setFormKey] = useState<number>(() => Date.now());

  // Mandatory primary fields
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [featured, setFeatured] = useState<boolean>(false);

  // Multilingual translations
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

  // Always reset fields when opening or unmounting the New Category page
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

    const cleanCategory = category.trim();
    if (!cleanCategory) {
      toastError("Category name is required.");
      return;
    }

    if (cleanCategory.length > 255) {
      toastError("Character size limit exceeded: Category Name must not exceed 255 characters.");
      return;
    }

    if (imageUrl.trim().length > 500) {
      toastError("Character size limit exceeded: Image URL must not exceed 500 characters.");
      return;
    }

    for (const [key, val] of Object.entries(translations)) {
      if (val && val.length > 255) {
        toastError(`Character size limit exceeded: ${key} must not exceed 255 characters.`);
        return;
      }
    }

    const payload: CreateCategoryPayload = {
      category: cleanCategory,
      imageUrl: imageUrl.trim() || undefined,
      displayOrder: Number(displayOrder) || 1,
      status,
      featured,
      ...translations,
    };

    startTransition(async () => {
      const res = await createCategoryAction(payload);
      if (res.success) {
        success(res.message || "Category created successfully");
        resetForm();
        router.push("/categories");
      } else {
        console.error("Backend error from createCategoryAction:", res.error);

        const errText = (res.error || "").toLowerCase();
        let displayMsg = res.error || "Failed to create category. Please check all fields and try again.";
        if (
          errText.includes("character") ||
          errText.includes("size") ||
          errText.includes("limit") ||
          errText.includes("too long") ||
          errText.includes("length")
        ) {
          displayMsg = "Character size limit exceeded. Please ensure all inputs are within the allowed limit.";
        }

        toastError(displayMsg);
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </Button>
      </div>

      <PageHeader
        title="Add New Category"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Categories List", href: "/categories" },
          { label: "Add Category" },
        ]}
      />

      <form key={formKey} onSubmit={handleSubmit} noValidate autoComplete="off" className="w-full space-y-6">

        {/* Basic Information Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            <CardDescription>
              Configure category name, image URL, display order, and status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  placeholder="e.g. Interior Textures"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="e.g. https://domain.com/category-image.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">
                  Display Order <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-end pb-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="featured"
                    checked={featured}
                    onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                  />
                  <Label htmlFor="featured" className="cursor-pointer font-medium text-slate-700">
                    Mark as Featured Category
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Translations Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-600" />
              <CardTitle>Multilingual Translations (Optional)</CardTitle>
            </div>
            <CardDescription>
              Provide regional translations for the category name across 10 Indian languages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const key = `category${lang.code}`;
                return (
                  <div key={lang.code} className="grid gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-xs font-semibold text-slate-700">
                        {lang.name}
                      </Label>
                      <span className="text-xs font-mono text-slate-400 uppercase">{lang.code}</span>
                    </div>
                    <Input
                      id={key}
                      placeholder={`Category in ${lang.name}`}
                      value={translations[key] || ""}
                      onChange={(e) => handleTranslationChange(key, e.target.value)}
                      maxLength={255}
                      className="bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-32"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Category"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
