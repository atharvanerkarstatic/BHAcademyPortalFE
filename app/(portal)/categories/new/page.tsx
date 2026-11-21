"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ImageUploadField } from "@/components/common/image-upload-field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createCategoryAction } from "@/features/categories/action";
import type { CreateCategoryPayload } from "@/features/categories/types";
import { queryKeys } from "@/lib/query-keys";
import {
  sanitizeTextInput,
  sanitizeNonNegativeNumber,
} from "@/lib/validations";

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

type CategoryTranslationKey =
  `category${(typeof TRANSLATION_LANGUAGES)[number]["code"]}`;

const INITIAL_TRANSLATIONS: Record<CategoryTranslationKey, string> = {
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
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formKey, setFormKey] = useState<number>(() => Date.now());

  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [featured, setFeatured] = useState<boolean>(false);

  const [translations, setTranslations] = useState<
    Record<CategoryTranslationKey, string>
  >(() => ({
    ...INITIAL_TRANSLATIONS,
  }));

  const resetForm = () => {
    setCategory("");
    setImageUrl("");
    setIsUploadingImage(false);
    setDisplayOrder(1);
    setStatus("ACTIVE");
    setFeatured(false);
    setTranslations({ ...INITIAL_TRANSLATIONS });
    setFormKey(Date.now());
  };

  const handleBack = () => {
    resetForm();
    router.back();
  };

  const handleTranslationChange = (
    key: CategoryTranslationKey,
    value: string
  ) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isUploadingImage) {
      toastError("Please wait for image upload to complete.");
      return;
    }

    const cleanCategory = sanitizeTextInput(category, 255);
    if (!cleanCategory) {
      toastError("Category name is required.");
      return;
    }

    const cleanImageUrl = sanitizeTextInput(imageUrl, 500);

    const sanitizedTranslations: Partial<
      Record<CategoryTranslationKey, string>
    > = {};
    for (const lang of TRANSLATION_LANGUAGES) {
      const key: CategoryTranslationKey = `category${lang.code}`;
      const val = translations[key];
      if (!val) {
        continue;
      }
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        ]);
        success("Category created successfully");
        resetForm();
        router.push("/categories");
      } else {
        toastError(
          res.error || "Failed to create category. Please check all fields."
        );
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

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Category
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
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
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
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
                  onChange={(e) => {
                    setCategory(e.target.value);
                  }}
                  placeholder="e.g. Interior Textures"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Category Image Upload */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-4">
              <Label
                htmlFor="cat-image-file"
                className="pt-2 text-xs font-semibold text-slate-700 sm:text-right"
              >
                Category Image
              </Label>
              <div className="sm:col-span-3">
                <ImageUploadField
                  id="cat-image-file"
                  value={imageUrl}
                  onChange={setImageUrl}
                  pathPrefix="category_image"
                  disabled={isPending}
                  onUploadingChange={setIsUploadingImage}
                  previewAlt="Category Preview"
                />
              </div>
            </div>

            {/* Display Order */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
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
                  onChange={(e) => {
                    setDisplayOrder(
                      sanitizeNonNegativeNumber(e.target.value, 0, 0)
                    );
                  }}
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
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
                  onChange={(e) => {
                    setStatus(
                      e.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE"
                    );
                  }}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4">
              <Label
                htmlFor="cat-featured"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Featured
              </Label>
              <div className="flex items-center gap-2 sm:col-span-3">
                <Checkbox
                  id="cat-featured"
                  checked={featured}
                  onCheckedChange={(checked) => {
                    setFeatured(Boolean(checked));
                  }}
                />
                <Label
                  htmlFor="cat-featured"
                  className="cursor-pointer text-xs font-medium text-slate-700"
                >
                  Display as Featured Category
                </Label>
              </div>
            </div>

            {/* Multilingual Section Divider */}
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                  Multilingual Translations (Optional)
                </h3>
              </div>
              <div className="space-y-3">
                {TRANSLATION_LANGUAGES.map((lang) => {
                  const key: CategoryTranslationKey = `category${lang.code}`;
                  return (
                    <div
                      key={lang.code}
                      className="grid grid-cols-1 items-center gap-4 sm:grid-cols-4"
                    >
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
                          onChange={(e) => {
                            handleTranslationChange(key, e.target.value);
                          }}
                          maxLength={255}
                          className="h-8 bg-white text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
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
                onClick={handleBack}
                disabled={isPending}
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
